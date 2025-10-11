import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto py-6 bg-transparent">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 text-center text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
        <p>هذه الأداة وقف لله تعالى ما أمكن الى ذلك سبيلاً (عن روح والدة من أعدّها - الفاتحة)</p>
        <p className="mt-1">
          من اعداد م. ناصر أصلان - نابلس - فلسطين ، واتساب: 
          <a 
            href="https://wa.me/970593225370" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="font-semibold text-slate-600 dark:text-slate-300 hover:underline"
            dir="ltr"
          >
            +970593225370
          </a>
        </p>
      </div>
    </footer>
  );
};
