# services/goal_guidance_service.py

import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import json
import torch
from sentence_transformers import SentenceTransformer
import numpy as np

logger = logging.getLogger(__name__)

class GoalGuidanceService:
    """
    Enhanced Goal-focused Learning Path Generator with semantic matching
    and structured topic-to-milestone mapping
    """
    
    def __init__(self, llm=None):
        """Initialize with LLM and semantic model"""
        if not llm:
            raise ValueError("LLM instance is required")
        
        self.llm = llm
        
        # Initialize semantic similarity model
        try:
            self.semantic_model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("[GOAL_GUIDANCE] Semantic model loaded successfully")
        except Exception as e:
            logger.warning(f"[GOAL_GUIDANCE] Could not load semantic model: {e}")
            self.semantic_model = None
        
        logger.info("[GOAL_GUIDANCE] Service initialized with AI engine")
        
        # Enhanced classification thresholds
        self.thresholds = {
            "mastery": {"weighted_accuracy": 80, "min_attempts": 5, "difficulty": ["Medium", "Hard"]},
            "strong": {"weighted_accuracy": 70, "min_attempts": 3},
            "improving": {"raw_accuracy_range": (50, 70), "trend": "improving"},
            "challenging": {"weighted_accuracy": 50, "difficulty": ["Medium", "Hard"]},
            "needs_review": {"raw_accuracy": 60},
            "min_attempts_classification": 3
        }
        
        # Semantic similarity threshold
        self.semantic_threshold = 0.5
        
        # Cache for common career paths to ensure consistency
        self.career_cache = {}
    
    def generate_learning_path(self, goal: str, performance_data: Dict, 
                              starting_position: Optional[str] = None) -> Dict:
        """
        Generate enhanced learning path with specific topics for each milestone
        """
        logger.info(f"[GOAL_GUIDANCE] Generating goal-focused path for: {goal}")
        
        # Check cache for consistent responses
        cache_key = goal.lower().strip()
        
        # Determine starting position
        current_position = starting_position or self._infer_starting_position(performance_data)
        
        # Get required skills with specific topics (use cache if available)
        if cache_key in self.career_cache:
            logger.info(f"[GOAL_GUIDANCE] Using cached roadmap for: {goal}")
            required_skills = self.career_cache[cache_key]
        else:
            required_skills = self._ai_get_required_skills(goal, current_position)
            self.career_cache[cache_key] = required_skills
            logger.info(f"[GOAL_GUIDANCE] Cached new roadmap for: {goal}")
        
        logger.info(f"[GOAL_GUIDANCE] AI identified {len(required_skills.get('milestones', []))} learning phases")
        
        # Map user's existing progress to required skills using semantic matching
        milestones = self._map_progress_to_milestones_semantic(
            required_skills, 
            performance_data
        )
        logger.info(f"[GOAL_GUIDANCE] Mapped user progress to {len(milestones)} milestones")
        
        # Classify user's topics with enhanced criteria
        topic_classification = self._classify_user_topics(performance_data)
        
        # Generate recommendations with topic classifications
        recommendations = self._generate_enhanced_recommendations(
            milestones, 
            required_skills,
            performance_data,
            topic_classification,
            goal
        )
        logger.info(f"[GOAL_GUIDANCE] Generated {len(recommendations)} recommendations")
        
        # Build complete learning path
        learning_path = {
            "goal": {
                "original": goal,
                "interpreted": required_skills["interpreted_goal"],
                "domains": required_skills["domains"],
                "description": required_skills.get("description", ""),
                "created_at": datetime.utcnow().isoformat()
            },
            "starting_position": {
                "level": current_position,
                "explicit": starting_position is not None,
                "inferred_from": "performance_data" if not starting_position else "user_input"
            },
            "milestones": milestones,
            "recommendations": recommendations,
            "topic_classification": topic_classification,
            "progress_summary": self._calculate_progress_summary(milestones),
            "visualization": self._generate_visualization_data(
                milestones, 
                current_position, 
                required_skills["interpreted_goal"]
            )
        }
        
        logger.info(f"[GOAL_GUIDANCE] Learning path generation completed")
        return learning_path
    
    def _infer_starting_position(self, performance_data: Dict) -> str:
        """Infer user's current level"""
        overall_acc = performance_data.get("overallAccuracy", 0)
        mastered = len(performance_data.get("masteredTopics", []))
        total_questions = performance_data.get("totalQuestionsSeen", 0)
        
        if overall_acc >= 80 and mastered >= 3 and total_questions >= 100:
            return "Advanced"
        elif overall_acc >= 65 and mastered >= 1 and total_questions >= 50:
            return "Intermediate"
        elif total_questions >= 20:
            return "Beginner"
        else:
            return "Complete Beginner"
    
    def _ai_get_required_skills(self, goal: str, starting_position: str) -> Dict:
        """
        Ask AI for complete roadmap with SPECIFIC topics for each skill
        """
        
        prompt = f"""You are a career guidance expert creating a detailed learning roadmap for: {goal}

Current Level: {starting_position}
Target Role: {goal}

Create a COMPREHENSIVE roadmap with 4-6 major milestones. Each milestone should have 3-5 skills, and EACH SKILL must list specific topics to learn.

Think about real job requirements and what {goal} professionals actually need to know.

Respond with ONLY valid JSON (no markdown, no explanation):
{{
    "interpreted_goal": "Professional title for {goal}",
    "description": "One sentence about this career",
    "domains": ["Domain 1", "Domain 2", "Domain 3", "Domain 4"],
    "milestones": [
        {{
            "phase": "Foundation Skills",
            "description": "Essential basics every {goal} needs",
            "order": 1,
            "required_skills": [
                {{
                    "skill": "Programming Fundamentals",
                    "importance": "critical",
                    "category": "technical",
                    "topics": [
                        "Variables and Data Types",
                        "Control Flow (if-else, loops)",
                        "Functions and Scope",
                        "Basic Data Structures (arrays, lists)",
                        "Error Handling"
                    ]
                }},
                {{
                    "skill": "Problem Solving",
                    "importance": "critical",
                    "category": "technical",
                    "topics": [
                        "Algorithm Basics",
                        "Logical Thinking",
                        "Debugging Techniques",
                        "Time Complexity Basics"
                    ]
                }}
            ]
        }},
        {{
            "phase": "Core Technical Skills",
            "description": "Main technical competencies for {goal}",
            "order": 2,
            "required_skills": [
                {{
                    "skill": "Data Structures",
                    "importance": "critical",
                    "category": "technical",
                    "topics": [
                        "Arrays and Strings",
                        "Linked Lists",
                        "Stacks and Queues",
                        "Hash Tables",
                        "Trees and Graphs"
                    ]
                }}
            ]
        }}
    ]
}}

IMPORTANT RULES:
1. Create 4-6 major milestones (not just 3)
2. Each skill MUST have a "topics" array with 3-8 specific, learnable topics
3. Topics should be concrete and testable (not vague like "Learn X")
4. For technical roles: include programming languages, frameworks, algorithms, tools
5. For business roles: include communication, negotiation, tools (CRM, Excel), market analysis
6. Topics should progress from basic to advanced within each milestone
7. Be consistent - if someone searches for the same role twice, give identical roadmap
8. CRITICAL: For "category" field, ONLY use these exact values: technical, business, soft, leadership, domain
   - Use "soft" for soft skills (NOT "soft skills" or "soft_skills")
   - Use "business" for business/finance skills (NOT "finance" or "operations")
   - Use "technical" for coding, algorithms, tools
   - Use "leadership" for management, team leadership
   - Use "domain" for industry-specific knowledge"""

        try:
            response = self.llm.invoke(prompt)
            response_text = response.content.strip()
            
            # Clean markdown if present
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            skills_data = json.loads(response_text)
            
            # Validate and sanitize the response
            valid_categories = {"technical", "business", "soft", "leadership", "domain"}
            valid_importance = {"critical", "important", "beneficial"}
            
            for milestone in skills_data.get("milestones", []):
                for skill in milestone.get("required_skills", []):
                    # Validate topics exist
                    if "topics" not in skill or not skill["topics"]:
                        logger.warning(f"[GOAL_GUIDANCE] Skill '{skill.get('skill')}' missing topics")
                        skill["topics"] = ["General Knowledge", "Practice Problems"]
                    
                    # Sanitize category
                    category = skill.get("category", "technical").lower().replace(" ", "_").replace("_skills", "")
                    if category == "soft_skills":
                        category = "soft"
                    elif category in ["finance", "operations", "sales", "marketing"]:
                        category = "business"
                    elif category not in valid_categories:
                        logger.warning(f"[GOAL_GUIDANCE] Invalid category '{category}', defaulting to 'technical'")
                        category = "technical"
                    skill["category"] = category
                    
                    # Validate importance
                    importance = skill.get("importance", "important")
                    if importance not in valid_importance:
                        skill["importance"] = "important"
            
            return skills_data
            
        except Exception as e:
            logger.error(f"[GOAL_GUIDANCE] AI analysis failed: {str(e)}")
            # Enhanced fallback structure
            return {
                "interpreted_goal": goal.title(),
                "description": f"Career path toward {goal}",
                "domains": ["Core Skills", "Technical Knowledge", "Professional Skills", "Advanced Topics"],
                "milestones": [
                    {
                        "phase": "Foundational Learning",
                        "description": "Build your base knowledge",
                        "order": 1,
                        "required_skills": [
                            {
                                "skill": "Problem Solving",
                                "importance": "critical",
                                "category": "technical",
                                "topics": ["Logical Thinking", "Algorithm Basics", "Debugging"]
                            }
                        ]
                    }
                ]
            }
    
    def _map_progress_to_milestones_semantic(self, required_skills: Dict, 
                                            performance_data: Dict) -> List[Dict]:
        """
        Map user's progress using semantic similarity for better matching
        """
        
        topic_progress = performance_data.get("topicProgress", {})
        user_topics = list(topic_progress.keys())
        
        # Precompute embeddings for user topics
        user_embeddings = None
        if self.semantic_model and user_topics:
            try:
                user_embeddings = self.semantic_model.encode(user_topics, convert_to_tensor=True)
            except Exception as e:
                logger.warning(f"[GOAL_GUIDANCE] Could not encode user topics: {e}")
        
        milestones = []
        
        for idx, milestone_data in enumerate(required_skills.get("milestones", [])):
            milestone = {
                "id": f"milestone_{idx + 1}",
                "order": idx + 1,
                "title": milestone_data["phase"],
                "description": milestone_data["description"],
                "status": "not_started",
                "minor_milestones": []
            }
            
            # For each required skill
            for skill_data in milestone_data.get("required_skills", []):
                skill_name = skill_data["skill"]
                importance = skill_data.get("importance", "important")
                category = skill_data.get("category", "technical")
                required_topics = skill_data.get("topics", [])
                
                # Find matching topics using semantic similarity
                matched_topics = self._find_matching_topics_semantic(
                    required_topics,
                    user_topics,
                    topic_progress,
                    user_embeddings
                )
                
                # Create minor milestone with topic details
                minor = self._create_minor_milestone_with_topics(
                    skill_name,
                    required_topics,
                    matched_topics,
                    topic_progress,
                    importance,
                    category
                )
                
                milestone["minor_milestones"].append(minor)
            
            # Calculate milestone status
            milestone["status"] = self._calculate_major_status(
                milestone["minor_milestones"],
                milestones
            )
            
            milestones.append(milestone)
        
        return milestones
    
    def _find_matching_topics_semantic(self, required_topics: List[str],
                                      user_topics: List[str],
                                      topic_progress: Dict,
                                      user_embeddings) -> List[Dict]:
        """
        Find user topics that match required topics using semantic similarity
        """
        if not required_topics or not user_topics:
            return []
        
        matched = []
        
        try:
            if self.semantic_model and user_embeddings is not None:
                # Encode required topics
                required_embeddings = self.semantic_model.encode(required_topics, convert_to_tensor=True)
                
                # Calculate cosine similarity
                similarities = torch.nn.functional.cosine_similarity(
                    required_embeddings.unsqueeze(1),
                    user_embeddings.unsqueeze(0),
                    dim=2
                )
                
                # For each required topic, find best matching user topic
                for req_idx, req_topic in enumerate(required_topics):
                    max_similarity = similarities[req_idx].max().item()
                    
                    if max_similarity >= self.semantic_threshold:
                        best_match_idx = similarities[req_idx].argmax().item()
                        user_topic = user_topics[best_match_idx]
                        
                        matched.append({
                            "required_topic": req_topic,
                            "user_topic": user_topic,
                            "similarity": round(max_similarity, 3),
                            "progress": topic_progress[user_topic]
                        })
            else:
                # Fallback to keyword matching
                for req_topic in required_topics:
                    best_match = self._find_matching_topic_keywords(req_topic, topic_progress)
                    if best_match:
                        matched.append({
                            "required_topic": req_topic,
                            "user_topic": best_match,
                            "similarity": 0.6,
                            "progress": topic_progress[best_match]
                        })
        
        except Exception as e:
            logger.error(f"[GOAL_GUIDANCE] Semantic matching failed: {e}")
            # Fallback to keyword matching
            for req_topic in required_topics:
                best_match = self._find_matching_topic_keywords(req_topic, topic_progress)
                if best_match:
                    matched.append({
                        "required_topic": req_topic,
                        "user_topic": best_match,
                        "similarity": 0.5,
                        "progress": topic_progress[best_match]
                    })
        
        return matched
    
    def _find_matching_topic_keywords(self, required_topic: str, 
                                     topic_progress: Dict) -> Optional[str]:
        """Fallback keyword-based matching"""
        req_lower = required_topic.lower()
        req_keywords = set(req_lower.split())
        
        best_match = None
        best_score = 0
        
        for user_topic in topic_progress.keys():
            user_lower = user_topic.lower()
            
            # Exact match
            if req_lower == user_lower:
                return user_topic
            
            # Keyword matching
            user_keywords = set(user_lower.split())
            common = req_keywords & user_keywords
            
            if common:
                score = len(common) / len(req_keywords)
                if score > best_score:
                    best_score = score
                    best_match = user_topic
        
        return best_match if best_score >= 0.5 else None
    
    def _create_minor_milestone_with_topics(self, skill_name: str,
                                           required_topics: List[str],
                                           matched_topics: List[Dict],
                                           topic_progress: Dict,
                                           importance: str,
                                           category: str) -> Dict:
        """
        Create minor milestone with detailed topic mapping
        """
        
        # Calculate overall progress for this skill
        if matched_topics:
            total_accuracy = sum(m["progress"].get("weightedAccuracy", m["progress"].get("accuracy", 0)) 
                               for m in matched_topics)
            avg_accuracy = total_accuracy / len(matched_topics)
            
            total_attempts = sum(m["progress"].get("attempts", 0) for m in matched_topics)
            
            completed_topics = sum(1 for m in matched_topics 
                                 if m["progress"].get("weightedAccuracy", 0) >= 80 
                                 and m["progress"].get("attempts", 0) >= 3)
        else:
            avg_accuracy = 0
            total_attempts = 0
            completed_topics = 0
        
        # Determine status based on topic completion
        topics_total = len(required_topics)
        topics_matched = len(matched_topics)
        
        if completed_topics >= topics_total * 0.8 and topics_matched >= topics_total * 0.7:
            status = "completed"
        elif topics_matched > 0:
            status = "in_progress"
        else:
            status = "not_started"
        
        # Build topic details
        topic_details = []
        for req_topic in required_topics:
            # Find if this topic was matched
            match = next((m for m in matched_topics if m["required_topic"] == req_topic), None)
            
            if match:
                progress = match["progress"]
                topic_details.append({
                    "topic": req_topic,
                    "status": "completed" if progress.get("weightedAccuracy", 0) >= 80 and progress.get("attempts", 0) >= 3 else "in_progress",
                    "user_topic_mapped": match["user_topic"],
                    "similarity_score": match["similarity"],
                    "accuracy": round(progress.get("accuracy", 0), 1),
                    "weighted_accuracy": round(progress.get("weightedAccuracy", progress.get("accuracy", 0)), 1),
                    "attempts": progress.get("attempts", 0),
                    "last_attempted": progress.get("lastAttempted")
                })
            else:
                topic_details.append({
                    "topic": req_topic,
                    "status": "not_started",
                    "user_topic_mapped": None,
                    "similarity_score": 0,
                    "accuracy": 0,
                    "weighted_accuracy": 0,
                    "attempts": 0,
                    "last_attempted": None
                })
        
        return {
            "skill": skill_name,
            "status": status,
            "importance": importance,
            "category": category,
            "overall_accuracy": round(avg_accuracy, 1),
            "total_attempts": total_attempts,
            "topics_required": topics_total,
            "topics_matched": topics_matched,
            "topics_completed": completed_topics,
            "completion_percentage": round((completed_topics / topics_total * 100) if topics_total > 0 else 0, 1),
            "topics": topic_details,
            "completion_criteria": {
                "required": "Complete 80% of topics with ≥80% weighted accuracy and ≥3 attempts each",
                "target_accuracy": 80,
                "min_attempts_per_topic": 3
            }
        }
    
    def _classify_user_topics(self, performance_data: Dict) -> Dict:
        """
        Classify user's topics according to enhanced criteria
        """
        topic_progress = performance_data.get("topicProgress", {})
        
        classification = {
            "mastered": [],
            "strong": [],
            "improving": [],
            "challenging": [],
            "needs_review": [],
            "unclassified": []
        }
        
        for topic, data in topic_progress.items():
            accuracy = data.get("accuracy", 0)
            weighted_acc = data.get("weightedAccuracy", accuracy)
            attempts = data.get("attempts", 0)
            trend = data.get("trend", "neutral")
            difficulty_breakdown = data.get("difficultyBreakdown", {})
            
            # Check if user has attempted medium/hard questions
            has_medium_hard = (difficulty_breakdown.get("Medium", {}).get("attempts", 0) > 0 or
                              difficulty_breakdown.get("Hard", {}).get("attempts", 0) > 0)
            
            classified = False
            
            # 🏆 Mastered: ≥80% weighted accuracy, 5+ attempts, with Medium/Hard quizzes
            if (weighted_acc >= 80 and attempts >= 5 and has_medium_hard):
                classification["mastered"].append({
                    "topic": topic,
                    "weighted_accuracy": weighted_acc,
                    "attempts": attempts,
                    "icon": "🏆"
                })
                classified = True
            
            # 💪 Strong: ≥70% weighted accuracy
            elif weighted_acc >= 70 and attempts >= 3:
                classification["strong"].append({
                    "topic": topic,
                    "weighted_accuracy": weighted_acc,
                    "attempts": attempts,
                    "icon": "💪"
                })
                classified = True
            
            # 📈 Improving: 50-70% raw accuracy with improving trend
            elif (50 <= accuracy <= 70 and trend == "improving"):
                classification["improving"].append({
                    "topic": topic,
                    "accuracy": accuracy,
                    "trend": trend,
                    "attempts": attempts,
                    "icon": "📈"
                })
                classified = True
            
            # 🎯 Challenging: <50% weighted accuracy on Medium/Hard
            elif weighted_acc < 50 and has_medium_hard:
                classification["challenging"].append({
                    "topic": topic,
                    "weighted_accuracy": weighted_acc,
                    "attempts": attempts,
                    "icon": "🎯"
                })
                classified = True
            
            # 📚 Needs Review: <60% raw accuracy
            elif accuracy < 60:
                classification["needs_review"].append({
                    "topic": topic,
                    "accuracy": accuracy,
                    "attempts": attempts,
                    "icon": "📚"
                })
                classified = True
            
            # ⚪ Unclassified: Doesn't fit clear criteria
            if not classified and attempts >= self.thresholds["min_attempts_classification"]:
                classification["unclassified"].append({
                    "topic": topic,
                    "accuracy": accuracy,
                    "weighted_accuracy": weighted_acc,
                    "attempts": attempts,
                    "note": "Needs more practice for clear classification",
                    "icon": "⚪"
                })
        
        return classification
    
    def _calculate_major_status(self, minor_milestones: List[Dict],
                               previous_milestones: List[Dict]) -> str:
        """Calculate milestone status based on minor milestone completion"""
        
        if not minor_milestones:
            return "not_started"
        
        # Check if previous milestone is completed
        if previous_milestones:
            last_milestone = previous_milestones[-1]
            if last_milestone["status"] != "completed":
                return "locked"
        
        completed = sum(1 for m in minor_milestones if m["status"] == "completed")
        in_progress = sum(1 for m in minor_milestones if m["status"] == "in_progress")
        total = len(minor_milestones)
        
        # All minor milestones completed = major milestone completed
        if completed == total:
            return "completed"
        elif completed > 0 or in_progress > 0:
            return "in_progress"
        else:
            return "not_started"
    
    def _generate_enhanced_recommendations(self, milestones: List[Dict],
                                          required_skills: Dict,
                                          performance_data: Dict,
                                          topic_classification: Dict,
                                          goal: str) -> List[Dict]:
        """
        Generate recommendations with topic classification insights
        """
        
        recommendations = []
        
        # Add classification summary
        mastered_count = len(topic_classification["mastered"])
        needs_review_count = len(topic_classification["needs_review"])
        unclassified_count = len(topic_classification["unclassified"])
        
        if mastered_count > 0:
            recommendations.append({
                "type": "classification_summary",
                "priority": "info",
                "message": f"🏆 Great progress! You've mastered {mastered_count} topic(s). These are solid foundations for your {goal} journey.",
                "details": [t["topic"] for t in topic_classification["mastered"][:5]]
            })
        
        if needs_review_count > 0:
            recommendations.append({
                "type": "needs_attention",
                "priority": "high",
                "message": f"📚 {needs_review_count} topic(s) need review (accuracy <60%). Focus on understanding fundamentals before moving forward.",
                "suggested_action": "Revisit these topics with easier problems first",
                "details": [t["topic"] for t in topic_classification["needs_review"][:3]]
            })
        
        if unclassified_count > 0:
            recommendations.append({
                "type": "needs_improvement",
                "priority": "medium",
                "message": f"⚪ {unclassified_count} topic(s) practiced but need more work for clear classification.",
                "suggested_action": "Continue practicing with varied difficulty levels",
                "details": [t["topic"] for t in topic_classification["unclassified"][:3]]
            })
        
        # Find current milestone
        current_milestone = next(
            (m for m in milestones if m["status"] in ["in_progress", "not_started"]),
            None
        )
        
        if not current_milestone:
            recommendations.append({
                "type": "celebration",
                "priority": "info",
                "message": f"🎉 Congratulations! You've completed all core milestones for becoming a {goal}!",
                "suggested_action": "Consider real-world projects or mentorship to apply your skills."
            })
            return recommendations
        
        # Analyze skills in current milestone
        for minor in current_milestone["minor_milestones"]:
            skill = minor["skill"]
            status = minor["status"]
            topics = minor["topics"]
            completion_pct = minor["completion_percentage"]
            importance = minor["importance"]
            
            # Not started critical skills
            if status == "not_started" and importance == "critical":
                topic_list = [t["topic"] for t in topics[:3]]
                recommendations.append({
                    "skill": skill,
                    "type": "critical_next",
                    "priority": "high",
                    "message": f"🎯 Critical skill to start: {skill}",
                    "suggested_action": f"Begin with these topics: {', '.join(topic_list)}",
                    "required_topics": [t["topic"] for t in topics]
                })
            
            # In progress but low completion
            elif status == "in_progress" and completion_pct < 50:
                incomplete_topics = [t["topic"] for t in topics if t["status"] != "completed"]
                recommendations.append({
                    "skill": skill,
                    "type": "continue_learning",
                    "priority": "high",
                    "message": f"📖 {skill}: {completion_pct:.0f}% complete. Keep going!",
                    "suggested_action": f"Focus on: {', '.join(incomplete_topics[:3])}",
                    "remaining_topics": incomplete_topics
                })
            
            # Almost complete
            elif completion_pct >= 70 and status != "completed":
                remaining = [t["topic"] for t in topics if t["status"] != "completed"]
                recommendations.append({
                    "skill": skill,
                    "type": "almost_complete",
                    "priority": "medium",
                    "message": f"🔥 {skill} is {completion_pct:.0f}% complete! Just a bit more!",
                    "suggested_action": f"Complete these to finish: {', '.join(remaining)}",
                    "remaining_topics": remaining
                })
        
        # Check for locked milestones
        locked_milestones = [m for m in milestones if m["status"] == "locked"]
        if locked_milestones:
            next_locked = locked_milestones[0]
            recommendations.append({
                "type": "milestone_preview",
                "priority": "info",
                "message": f"🔒 Next phase: {next_locked['title']}",
                "suggested_action": f"Complete current phase to unlock: {next_locked['description']}"
            })
        
        # Sort recommendations
        priority_order = {"high": 0, "medium": 1, "low": 2, "info": 3}
        recommendations.sort(key=lambda x: priority_order.get(x["priority"], 1))
        
        return recommendations[:15]
    

    
    def _calculate_progress_summary(self, milestones: List[Dict]) -> Dict:
        """Calculate enhanced progress statistics"""
        
        total_major = len(milestones)
        completed_major = sum(1 for m in milestones if m["status"] == "completed")
        in_progress_major = sum(1 for m in milestones if m["status"] == "in_progress")
        
        total_minor = sum(len(m["minor_milestones"]) for m in milestones)
        completed_minor = sum(
            sum(1 for minor in m["minor_milestones"] if minor["status"] == "completed")
            for m in milestones
        )
        in_progress_minor = sum(
            sum(1 for minor in m["minor_milestones"] if minor["status"] == "in_progress")
            for m in milestones
        )
        
        # Calculate topic-level progress
        total_topics = sum(
            sum(minor["topics_required"] for minor in m["minor_milestones"])
            for m in milestones
        )
        completed_topics = sum(
            sum(minor["topics_completed"] for minor in m["minor_milestones"])
            for m in milestones
        )
        
        return {
            "major_milestones": {
                "total": total_major,
                "completed": completed_major,
                "in_progress": in_progress_major,
                "percentage": round((completed_major / total_major * 100) if total_major > 0 else 0, 1)
            },
            "minor_milestones": {
                "total": total_minor,
                "completed": completed_minor,
                "in_progress": in_progress_minor,
                "percentage": round((completed_minor / total_minor * 100) if total_minor > 0 else 0, 1)
            },
            "topics": {
                "total": total_topics,
                "completed": completed_topics,
                "percentage": round((completed_topics / total_topics * 100) if total_topics > 0 else 0, 1)
            },
            "overall_progress": round(
                ((completed_major / total_major * 0.4) + 
                 (completed_minor / total_minor * 0.3) +
                 (completed_topics / total_topics * 0.3)) * 100
                if total_major > 0 and total_minor > 0 and total_topics > 0 else 0, 1
            )
        }
    
    def _generate_visualization_data(self, milestones: List[Dict],
                                    starting_position: str,
                                    goal_title: str) -> Dict:
        """Generate visualization nodes"""
        
        nodes = [{"id": "start", "type": "start", "label": starting_position, "position": 0}]
        
        for idx, milestone in enumerate(milestones):
            nodes.append({
                "id": milestone["id"],
                "type": "major",
                "label": milestone["title"],
                "status": milestone["status"],
                "position": idx + 1,
                "completion": sum(1 for m in milestone["minor_milestones"] if m["status"] == "completed") / len(milestone["minor_milestones"]) * 100 if milestone["minor_milestones"] else 0
            })
            
            for minor_idx, minor in enumerate(milestone["minor_milestones"]):
                nodes.append({
                    "id": f"{milestone['id']}_minor_{minor_idx}",
                    "type": "minor",
                    "label": minor["skill"],
                    "status": minor["status"],
                    "parent": milestone["id"],
                    "completion": minor["completion_percentage"]
                })
        
        nodes.append({
            "id": "goal",
            "type": "goal",
            "label": goal_title,
            "position": len(milestones) + 1
        })
        
        return {
            "nodes": nodes,
            "path_type": "curved_dotted",
            "layout": "hierarchical"
        }
    
    def update_milestone_progress(self, learning_path: Dict,
                                  topic: str,
                                  quiz_result: Dict) -> Dict:
        """
        Update milestone when user completes a quiz - automatically updates status
        """
        
        accuracy = quiz_result.get("accuracy", 0)
        weighted_acc = quiz_result.get("weightedAccuracy", accuracy)
        difficulty = quiz_result.get("difficulty", "Easy")
        
        updated = False
        
        # Re-encode user topic for semantic matching
        if self.semantic_model:
            try:
                topic_embedding = self.semantic_model.encode([topic], convert_to_tensor=True)
            except:
                topic_embedding = None
        else:
            topic_embedding = None
        
        for milestone in learning_path["milestones"]:
            for minor in milestone["minor_milestones"]:
                # Check each required topic in this skill
                for topic_detail in minor["topics"]:
                    required_topic = topic_detail["topic"]
                    
                    # Check semantic similarity
                    is_match = False
                    
                    if topic_embedding is not None and self.semantic_model:
                        try:
                            req_embedding = self.semantic_model.encode([required_topic], convert_to_tensor=True)
                            similarity = torch.nn.functional.cosine_similarity(
                                topic_embedding, req_embedding
                            ).item()
                            
                            if similarity >= self.semantic_threshold:
                                is_match = True
                                topic_detail["similarity_score"] = round(similarity, 3)
                        except:
                            pass
                    
                    # Fallback to keyword matching
                    if not is_match:
                        is_match = self._topics_match_keywords(topic, required_topic)
                    
                    if is_match:
                        # Update topic details
                        topic_detail["user_topic_mapped"] = topic
                        topic_detail["accuracy"] = round(accuracy, 1)
                        topic_detail["weighted_accuracy"] = round(weighted_acc, 1)
                        topic_detail["attempts"] = topic_detail.get("attempts", 0) + 1
                        topic_detail["last_attempted"] = datetime.utcnow().isoformat()
                        
                        # Update status based on criteria
                        if (weighted_acc >= 80 and 
                            topic_detail["attempts"] >= 3 and
                            difficulty in ["Medium", "Hard"]):
                            topic_detail["status"] = "completed"
                        else:
                            topic_detail["status"] = "in_progress"
                        
                        updated = True
                        logger.info(f"[GOAL_GUIDANCE] Updated topic '{required_topic}' with quiz '{topic}'")
                
                if updated:
                    # Recalculate skill-level metrics
                    completed_topics = sum(1 for t in minor["topics"] if t["status"] == "completed")
                    total_topics = len(minor["topics"])
                    
                    minor["topics_completed"] = completed_topics
                    minor["completion_percentage"] = round((completed_topics / total_topics * 100) if total_topics > 0 else 0, 1)
                    
                    # Update skill status
                    if completed_topics >= total_topics * 0.8:  # 80% of topics completed
                        minor["status"] = "completed"
                    elif completed_topics > 0:
                        minor["status"] = "in_progress"
                    
                    # Recalculate overall accuracy
                    topic_accs = [t["weighted_accuracy"] for t in minor["topics"] if t["attempts"] > 0]
                    if topic_accs:
                        minor["overall_accuracy"] = round(sum(topic_accs) / len(topic_accs), 1)
                    
                    break
            
            if updated:
                # Recalculate milestone status
                prev_milestones = [m for m in learning_path["milestones"]
                                 if m["order"] < milestone["order"]]
                milestone["status"] = self._calculate_major_status(
                    milestone["minor_milestones"],
                    prev_milestones
                )
                break
        
        # Update progress summary
        learning_path["progress_summary"] = self._calculate_progress_summary(
            learning_path["milestones"]
        )
        learning_path["last_updated"] = datetime.utcnow().isoformat()
        
        if not updated:
            logger.warning(f"[GOAL_GUIDANCE] Quiz topic '{topic}' doesn't match any required topics")
        
        return learning_path
    
    def _topics_match_keywords(self, topic: str, required_topic: str) -> bool:
        """Keyword-based topic matching"""
        topic_lower = topic.lower()
        required_lower = required_topic.lower()
        
        # Exact match
        if topic_lower == required_lower:
            return True
        
        # One contains the other
        if topic_lower in required_lower or required_lower in topic_lower:
            return True
        
        # Keyword matching
        topic_keywords = set(topic_lower.split())
        required_keywords = set(required_lower.split())
        common = topic_keywords & required_keywords
        
        # Need at least 65% keyword overlap
        if common and len(common) / len(required_keywords) >= 0.65:
            return True
        
        return False
    
    def get_classification_guide(self) -> Dict:
        """
        Return classification guide for frontend display
        """
        return {
            "mastered": {
                "icon": "🏆",
                "label": "Mastered",
                "criteria": "≥80% weighted accuracy, 5+ attempts, with Medium/Hard quizzes",
                "description": "Topics you've fully mastered with challenging problems",
                "color": "#4CAF50"
            },
            "strong": {
                "icon": "💪",
                "label": "Strong",
                "criteria": "≥70% weighted accuracy",
                "description": "Solid understanding, keep practicing",
                "color": "#2196F3"
            },
            "improving": {
                "icon": "📈",
                "label": "Improving",
                "criteria": "Raw accuracy 50-70% with clear positive recent trend",
                "description": "You're making progress! Keep going!",
                "color": "#FF9800"
            },
            "challenging": {
                "icon": "🎯",
                "label": "Challenging",
                "criteria": "Weighted accuracy <50% on Medium/Hard attempts",
                "description": "These topics need focused attention",
                "color": "#F44336"
            },
            "needs_review": {
                "icon": "📚",
                "label": "Needs Review",
                "criteria": "Raw accuracy <60%",
                "description": "Fundamentals need reinforcement",
                "color": "#9C27B0"
            },
            "unclassified": {
                "icon": "⚪",
                "label": "Unclassified",
                "criteria": "3+ attempts but doesn't fit clear criteria",
                "description": "Needs more practice for clear classification",
                "color": "#9E9E9E"
            }
        }
    
    def regenerate_recommendations(self, learning_path: Dict, 
                                  performance_data: Dict) -> List[Dict]:
        """
        Regenerate recommendations without calling AI again
        """
        milestones = learning_path["milestones"]
        goal = learning_path["goal"]["original"]
        
        # Reclassify topics
        topic_classification = self._classify_user_topics(performance_data)
        
        # Generate fresh recommendations
        recommendations = self._generate_enhanced_recommendations(
            milestones,
            learning_path["goal"],
            performance_data,
            topic_classification,
            goal
        )
        
        return recommendations
    
    def update_milestones_only(self, existing_path: Dict, performance_data: Dict) -> Dict:
        """
        Update only milestone progress without regenerating the entire path
        """
        logger.info("[GOAL_GUIDANCE] Updating milestones only (no regeneration)")
        
        # Get the existing required skills structure
        required_skills = {
            "interpreted_goal": existing_path["goal"]["interpreted"],
            "domains": existing_path["goal"]["domains"],
            "description": existing_path["goal"].get("description", ""),
            "milestones": []
        }
        
        # Reconstruct required skills from existing milestones
        for milestone in existing_path["milestones"]:
            milestone_skills = []
            for minor in milestone["minor_milestones"]:
                milestone_skills.append({
                    "skill": minor["skill"],
                    "importance": minor["importance"],
                    "category": minor["category"],
                    "topics": [t["topic"] for t in minor["topics"]]
                })
            
            required_skills["milestones"].append({
                "phase": milestone["title"],
                "description": milestone["description"],
                "order": milestone["order"],
                "required_skills": milestone_skills
            })
        
        # Re-map progress with updated performance data
        topic_progress = performance_data.get("topicProgress", {})
        user_topics = list(topic_progress.keys())
        
        # Precompute embeddings
        user_embeddings = None
        if self.semantic_model and user_topics:
            try:
                user_embeddings = self.semantic_model.encode(user_topics, convert_to_tensor=True)
            except Exception as e:
                logger.warning(f"[GOAL_GUIDANCE] Could not encode user topics: {e}")
        
        updated_milestones = []
        
        for milestone in existing_path["milestones"]:
            updated_milestone = {
                "id": milestone["id"],
                "order": milestone["order"],
                "title": milestone["title"],
                "description": milestone["description"],
                "status": milestone["status"],
                "minor_milestones": []
            }
            
            # Update each minor milestone
            for minor in milestone["minor_milestones"]:
                required_topics = [t["topic"] for t in minor["topics"]]
                
                # Find matching topics with current data
                matched_topics = self._find_matching_topics_semantic(
                    required_topics,
                    user_topics,
                    topic_progress,
                    user_embeddings
                )
                
                # Recreate minor milestone with fresh data
                updated_minor = self._create_minor_milestone_with_topics(
                    minor["skill"],
                    required_topics,
                    matched_topics,
                    topic_progress,
                    minor["importance"],
                    minor["category"]
                )
                
                updated_milestone["minor_milestones"].append(updated_minor)
            
            # Recalculate milestone status
            prev_milestones = [m for m in updated_milestones]
            updated_milestone["status"] = self._calculate_major_status(
                updated_milestone["minor_milestones"],
                prev_milestones
            )
            
            updated_milestones.append(updated_milestone)
        
        # Update only the relevant fields
        existing_path["milestones"] = updated_milestones
        existing_path["progress_summary"] = self._calculate_progress_summary(updated_milestones)
        existing_path["last_updated"] = datetime.utcnow().isoformat()
        
        # Update topic classification
        topic_classification = self._classify_user_topics(performance_data)
        existing_path["topic_classification"] = topic_classification
        
        # Regenerate recommendations based on new data
        existing_path["recommendations"] = self._generate_enhanced_recommendations(
            updated_milestones,
            required_skills,
            performance_data,
            topic_classification,
            existing_path["goal"]["original"]
        )
        
        logger.info("[GOAL_GUIDANCE] Milestone update completed")
        return existing_path