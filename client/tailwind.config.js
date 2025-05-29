// tailwind.config.js
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    darkMode: "class", // نستخدم class-based dark mode للتحكم اليدوي
    theme: {
        extend: {
            fontFamily: {
                cairo: ['Cairo', 'sans-serif'],
            },
        },
    },
    plugins: [require("daisyui")],
    daisyui: {
        darkTheme: "dark",  // اسم الثيم الداكن داخل DaisyUI
        themes: [
            {
                mytheme: {
                    "primary": "#4f46e5",
                    "secondary": "#6366f1",
                    "accent": "#f43f5e",
                    "neutral": "#374151",
                    "base-100": "#ffffff",
                    "info": "#3b82f6",
                    "success": "#22c55e",
                    "warning": "#f59e0b",
                    "error": "#ef4444",
                },
            },
            "dark", // تفعيل الثيم الداكن الجاهز من DaisyUI
        ],
    },
};
