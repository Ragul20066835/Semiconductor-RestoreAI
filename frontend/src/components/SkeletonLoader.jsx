import React from 'react';

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-5 animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-4 bg-white/10 rounded w-24" />
        <div className="h-7 w-7 rounded-lg bg-white/10" />
      </div>
      <div className="space-y-2">
        <div className="h-8 bg-white/10 rounded w-16" />
        <div className="h-3 bg-white/5 rounded w-36" />
      </div>
    </div>
  );
}

export function ImageSkeleton() {
  return (
    <div className="w-full aspect-video rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center justify-center animate-pulse gap-3">
      <div className="h-8 w-8 rounded-lg bg-white/10" />
      <div className="h-3 bg-white/10 rounded w-48" />
      <div className="h-2 bg-white/5 rounded w-32" />
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <tr className="animate-pulse border-b border-white/5">
      <td className="p-4"><div className="h-4 bg-white/10 rounded w-24" /></td>
      <td className="p-4"><div className="h-4 bg-white/10 rounded w-32" /></td>
      <td className="p-4"><div className="h-4 bg-white/10 rounded w-16" /></td>
      <td className="p-4"><div className="h-4 bg-white/10 rounded w-16" /></td>
      <td className="p-4 flex gap-2"><div className="h-7 bg-white/10 rounded w-16" /><div className="h-7 bg-white/10 rounded w-16" /></td>
    </tr>
  );
}
