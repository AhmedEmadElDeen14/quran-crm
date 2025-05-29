import React from "react";

function Button({ children, variant = "primary", size = "md", className = "", disabled = false, ...props }) {
    const baseClasses = "btn";
    const variantClasses = {
        primary: "btn-primary",
        secondary: "btn-secondary",
        accent: "btn-accent",
        error: "btn-error",
        ghost: "btn-ghost",
        outline: "btn-outline",
    };
    const sizeClasses = {
        sm: "btn-sm",
        md: "btn-md",
        lg: "btn-lg",
    };

    const classes = `${baseClasses} ${variantClasses[variant] || variantClasses.primary} ${sizeClasses[size] || sizeClasses.md} ${className}`;

    return (
        <button className={classes} disabled={disabled} {...props}>
            {children}
        </button>
    );
}

export default Button;
