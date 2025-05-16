import React from 'react';

interface SkeletonProps {
  width?: string;
  height?: string;
  rounded?: string;
  className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ width = 'w-full', height = 'h-4', rounded = 'rounded', className = '' }) => (
  <div
    className={`bg-gray-200 animate-pulse ${width} ${height} ${rounded} ${className}`}
    style={{ minWidth: 0 }}
  />
);

export default Skeleton; 