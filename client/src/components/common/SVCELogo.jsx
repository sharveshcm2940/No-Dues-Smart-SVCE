import React from 'react';

export const SVCELogo = ({ className = "h-20 sm:h-24", alt = "Sri Venkateswara College of Engineering" }) => {
  return (
    <div className={`inline-flex items-center justify-center select-none ${className}`}>
      <img 
        src="/svce_logo.png" 
        alt={alt} 
        className="h-full w-auto object-contain max-w-full drop-shadow-xs"
      />
    </div>
  );
};

export default SVCELogo;
