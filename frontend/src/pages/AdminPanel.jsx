import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../services/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { Trash2, Edit2, X, Check, Shield, ShieldOff, Search } from 'lucide-react';

const AdminPanel = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'admin', 'suspended'

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const usersCollection = collection(db, 'users');
            const usersSnapshot = await getDocs(usersCollection);
            const usersList = usersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setUsers(usersList);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (user) => {
        setEditingUser(user.id);
        setEditForm({
            name: user.name || '',
            email: user.email || '',
            userId: user.userId || '',
            isAdmin: user.isAdmin || false,
            isSuspended: user.isSuspended || false
        });
    };

    const handleCancelEdit = () => {
        setEditingUser(null);
        setEditForm({});
    };

    const handleSaveEdit = async (userId) => {
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, editForm);
            toast.success('User updated successfully');
            setEditingUser(null);
            fetchUsers();
        } catch (error) {
            console.error('Error updating user:', error);
            toast.error('Failed to update user');
        }
    };

    const handleDelete = async (userId) => {
        if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            try {
                await deleteDoc(doc(db, 'users', userId));
                toast.success('User deleted successfully');
                fetchUsers();
            } catch (error) {
                console.error('Error deleting user:', error);
                toast.error('Failed to delete user');
            }
        }
    };

    const toggleSuspend = async (userId, currentStatus) => {
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, { isSuspended: !currentStatus });
            toast.success(currentStatus ? 'User unsuspended' : 'User suspended');
            fetchUsers();
        } catch (error) {
            console.error('Error updating suspension status:', error);
            toast.error('Failed to update suspension status');
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Calculate counts
    const counts = {
        total: users.length,
        active: users.filter(u => !u.isAdmin && !u.isSuspended).length,
        admin: users.filter(u => u.isAdmin).length,
        suspended: users.filter(u => u.isSuspended).length
    };

    // Filter users based on search query and status filter
    const filteredUsers = users.filter((user) => {
        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const name = (user.name || '').toLowerCase();
            const email = (user.email || '').toLowerCase();
            const userId = (user.userId || '').toLowerCase();

            if (!name.includes(query) && !email.includes(query) && !userId.includes(query)) {
                return false;
            }
        }

        // Status filter
        if (filterStatus === 'all') return true;
        if (filterStatus === 'admin') return user.isAdmin === true;
        if (filterStatus === 'suspended') return user.isSuspended === true;
        if (filterStatus === 'active') return !user.isAdmin && !user.isSuspended;

        return true;
    });

    if (loading) {
        return (
            <div className="min-h-screen mt-12 flex items-center justify-center bg-gray-50 relative overflow-hidden">
                {/* Background Animation */}
                <div className="absolute inset-0">
                    <motion.div
                        className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-green-400/10 to-blue-500/10 rounded-full blur-3xl"
                        animate={{ x: [0, 100, 0], y: [0, -50, 0] }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.div
                        className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full blur-3xl"
                        animate={{ x: [0, -80, 0], y: [0, 60, 0] }}
                        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    />
                </div>

                {/* Loading Content */}
                <div className="text-center relative z-10">
                    <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          {/* Spinner */}
          <div className="mx-auto mb-4 h-12 w-12 rounded-full border-1 border-b-2 border-blue-500 animate-spin" />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-gray-600 font-medium"
          >
            Loading Users...
          </motion.p>
        </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen mt-12 bg-gray-50 py-4 sm:py-8 px-3 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Subtle Background Animation */}
            <div className="absolute inset-0 pointer-events-none">
                <motion.div
                    className="absolute top-20 -left-20 sm:left-10 w-48 sm:w-72 h-48 sm:h-72 bg-gradient-to-r from-green-400/5 to-blue-500/5 rounded-full blur-3xl"
                    animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                    className="absolute bottom-20 -right-20 sm:right-10 w-64 sm:w-96 h-64 sm:h-96 bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-full blur-3xl"
                    animate={{ x: [0, -50, 0], y: [0, 40, 0] }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-7xl mx-auto relative z-10"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                >
                    {/* Header */}
                    <div className="px-4 sm:px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                        >
                            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900" style={{fontFamily:'verdana'}}>User Management</h1>

                            {/* Stats Cards */}
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3" style={{fontFamily:'verdana'}}>
                                {/* LEFT SIDE */}
                                <p className="text-sm text-gray-500">
                                    Total users: <span className="font-medium text-gray-700">{users.length}</span>
                                </p>

                                {/* RIGHT SIDE FILTERS */}
                                <div className="flex flex-wrap gap-2">
                                    {/* ALL */}
                                    <button
                                        onClick={() => setFilterStatus('all')}
                                        className={`px-2 py-1 rounded-md text-xs font-medium border transition-all
        ${filterStatus === 'all'
                                                ? 'bg-gray-100 text-gray-800 border-gray-400 shadow-sm'
                                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        All ({counts.total})
                                    </button>

                                    {/* ACTIVE */}
                                    <button
                                        onClick={() => setFilterStatus('active')}
                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-all
        ${filterStatus === 'active'
                                                ? 'bg-green-100 text-green-800 border-green-400 shadow-sm'
                                                : 'bg-green-50 text-green-700 border-green-200 hover:border-green-300'
                                            }`}
                                    >
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        Active ({counts.active})
                                    </button>

                                    {/* ADMIN */}
                                    <button
                                        onClick={() => setFilterStatus('admin')}
                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-all
        ${filterStatus === 'admin'
                                                ? 'bg-blue-100 text-blue-800 border-blue-400 shadow-sm'
                                                : 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-300'
                                            }`}
                                    >
                                        <Shield size={12} />
                                        Admin ({counts.admin})
                                    </button>

                                    {/* SUSPENDED */}
                                    <button
                                        onClick={() => setFilterStatus('suspended')}
                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-all
        ${filterStatus === 'suspended'
                                                ? 'bg-purple-100 text-purple-800 border-purple-400 shadow-sm'
                                                : 'bg-purple-50 text-purple-700 border-purple-200 hover:border-purple-300'
                                            }`}
                                    >
                                        <ShieldOff size={12} />
                                        Suspended ({counts.suspended})
                                    </button>
                                </div>
                            </div>


                            {/* Active Filter Indicator */}
                            {filterStatus !== 'all' && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-3 flex items-center gap-2"
                                >
                                    <span className="text-sm text-gray-600">
                                        Filtering by: <span className="font-semibold capitalize">{filterStatus}</span>
                                    </span>
                                    <button
                                        onClick={() => setFilterStatus('all')}
                                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                        Clear filter
                                    </button>
                                </motion.div>
                            )}

                            {/* Search Bar */}
                            <div className="mt-4">
                                <div className="relative max-w-md">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by name, email, or user ID..."
                                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                                {searchQuery && (
                                    <p className="mt-2 text-sm text-gray-500">
                                        Showing {filteredUsers.length} result{filteredUsers.length !== 1 ? 's' : ''}
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    </div>

                    {/* Table - Desktop View */}
                    <div className="hidden lg:block overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Info</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                <AnimatePresence>
                                    {filteredUsers.map((user, index) => (
                                        <motion.tr
                                            key={user.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05, duration: 0.3 }}
                                            className="hover:bg-gray-50 transition-colors"
                                        >
                                            {editingUser === user.id ? (
                                                <>
                                                    <td className="px-6 py-4">
                                                        <div className="space-y-2">
                                                            <input
                                                                type="text"
                                                                value={editForm.name}
                                                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                placeholder="Name"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={editForm.userId}
                                                                onChange={(e) => setEditForm({ ...editForm, userId: e.target.value })}
                                                                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                placeholder="User ID"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <input
                                                            type="email"
                                                            value={editForm.email}
                                                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                            placeholder="Email"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        {formatDate(user.createdAt)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="space-y-2">
                                                            <label className="flex items-center space-x-2">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={editForm.isAdmin}
                                                                    onChange={(e) => setEditForm({ ...editForm, isAdmin: e.target.checked })}
                                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                                />
                                                                <span className="text-sm text-gray-700">Admin</span>
                                                            </label>
                                                            <label className="flex items-center space-x-2">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={editForm.isSuspended}
                                                                    onChange={(e) => setEditForm({ ...editForm, isSuspended: e.target.checked })}
                                                                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                                />
                                                                <span className="text-sm text-gray-700">Suspended</span>
                                                            </label>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => handleSaveEdit(user.id)}
                                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                                title="Save"
                                                            >
                                                                <Check size={18} />
                                                            </button>
                                                            <button
                                                                onClick={handleCancelEdit}
                                                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                                title="Cancel"
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <div className="text-sm font-medium text-gray-900">{user.name || 'N/A'}</div>
                                                            <div className="text-sm text-gray-500">{user.userId || 'N/A'}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm text-gray-900">{user.email || 'N/A'}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm text-gray-500">{formatDate(user.createdAt)}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1.5">
                                                            {user.isAdmin && (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 w-fit border border-blue-200">
                                                                    <Shield size={12} />
                                                                    Admin
                                                                </span>
                                                            )}
                                                            {user.isSuspended && (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 w-fit border border-purple-200">
                                                                    <ShieldOff size={12} />
                                                                    Suspended
                                                                </span>
                                                            )}
                                                            {!user.isAdmin && !user.isSuspended && (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 w-fit border border-green-200">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                                                    Active
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => toggleSuspend(user.id, user.isSuspended)}
                                                                className={`p-2 rounded-lg transition-colors ${user.isSuspended
                                                                        ? 'text-green-600 hover:bg-green-50'
                                                                        : 'text-purple-600 hover:bg-purple-50'
                                                                    }`}
                                                                title={user.isSuspended ? 'Unsuspend' : 'Suspend'}
                                                            >
                                                                <ShieldOff size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleEdit(user)}
                                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit2 size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(user.id)}
                                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="lg:hidden p-3 sm:p-4 space-y-3">
                        <AnimatePresence>
                            {filteredUsers.map((user, index) => (
                                <motion.div
                                    key={user.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05, duration: 0.3 }}
                                    className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    {editingUser === user.id ? (
                                        <div className="space-y-3">
                                            <input
                                                type="text"
                                                value={editForm.name}
                                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="Name"
                                            />
                                            <input
                                                type="text"
                                                value={editForm.userId}
                                                onChange={(e) => setEditForm({ ...editForm, userId: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="User ID"
                                            />
                                            <input
                                                type="email"
                                                value={editForm.email}
                                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="Email"
                                            />
                                            <div className="flex gap-4">
                                                <label className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={editForm.isAdmin}
                                                        onChange={(e) => setEditForm({ ...editForm, isAdmin: e.target.checked })}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="text-sm text-gray-700">Admin</span>
                                                </label>
                                                <label className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={editForm.isSuspended}
                                                        onChange={(e) => setEditForm({ ...editForm, isSuspended: e.target.checked })}
                                                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                    />
                                                    <span className="text-sm text-gray-700">Suspended</span>
                                                </label>
                                            </div>
                                            <div className="flex gap-2 pt-2">
                                                <button
                                                    onClick={() => handleSaveEdit(user.id)}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                                >
                                                    <Check size={16} />
                                                    Save
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                                >
                                                    <X size={16} />
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h3 className="font-medium text-gray-900">{user.name || 'N/A'}</h3>
                                                    <p className="text-sm text-gray-500">{user.userId || 'N/A'}</p>
                                                    <p className="text-sm text-gray-600 mt-1">{user.email || 'N/A'}</p>
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    {user.isAdmin && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                                            <Shield size={10} />
                                                            Admin
                                                        </span>
                                                    )}
                                                    {user.isSuspended && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                                            <ShieldOff size={10} />
                                                            Suspended
                                                        </span>
                                                    )}
                                                    {!user.isAdmin && !user.isSuspended && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                                            Active
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-500 mb-3">Created: {formatDate(user.createdAt)}</p>
                                            <div className="flex gap-2 pt-2 border-t border-gray-100">
                                                <button
                                                    onClick={() => toggleSuspend(user.id, user.isSuspended)}
                                                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${user.isSuspended
                                                            ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                                                            : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                                                        }`}
                                                >
                                                    <ShieldOff size={14} />
                                                    {user.isSuspended ? 'Unsuspend' : 'Suspend'}
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium transition-colors border border-blue-200"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-medium transition-colors border border-red-200"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {users.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-center py-12"
                        >
                            <p className="text-gray-500">No users found</p>
                        </motion.div>
                    )}

                    {users.length > 0 && filteredUsers.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-center py-12"
                        >
                            <Search className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                            <p className="text-gray-500">No users match your search</p>
                            <button
                                onClick={() => setSearchQuery('')}
                                className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                                Clear search
                            </button>
                        </motion.div>
                    )}
                </motion.div>
            </motion.div>
        </div>
    );
};

export default AdminPanel;