import React from 'react';

const Input = ({
  type = 'text',
  value,
  onChange,
  onKeyPress,
  placeholder,
  className = '',
  inputClassName = '',
  disabled = false,
  ...rest
}) => {
  return (
    <div className={className}>
      <input
        type={type}
        value={value}
        onChange={onChange}
        onKeyPress={onKeyPress}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full outline-none focus:ring-0 ${inputClassName}`}
        {...rest}
      />
    </div>
  );
};

export default Input;
