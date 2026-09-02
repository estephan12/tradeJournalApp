'use client';

import React, { useState } from 'react';
import { useTrades } from '@/context/trade-context';
import { Tag as TagIcon, Plus } from 'lucide-react';

export default function TagsPage() {
  const { tags, trades, addTag } = useTrades();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#38BDF8');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await addTag(name, color);
    setName('');
    setShowAdd(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="pb-2 border-b border-[#26313D] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold font-mono text-[#F5F7FA] tracking-wide">
            TRADE TAGS
          </h1>
          <p className="text-xs text-[#8B98A8]">
            Organize trades with granular labels for behavioral and contextual categorization
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#38BDF8] text-[#0B0F14] font-semibold text-xs hover:bg-[#0284C7] transition-colors"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Tag</span>
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="p-4 bg-[#111820] border border-[#38BDF8]/40 rounded-lg space-y-3"
        >
          <div className="text-xs font-mono uppercase text-[#38BDF8]">CREATE TAG</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              placeholder="Tag Name (e.g. CPI Release, High Volatility, Scalp)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 px-3 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
            />
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-8 bg-transparent cursor-pointer rounded"
              />
              <span className="text-xs font-mono text-[#8B98A8]">{color}</span>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-3 py-1.5 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#8B98A8]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-[#38BDF8] text-[#0B0F14] font-semibold text-xs"
            >
              Save Tag
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {tags.map((tag) => {
          const count = trades.filter((t) => t.tags?.includes(tag.name)).length;
          return (
            <div
              key={tag.id}
              className="bg-[#111820] border border-[#26313D] rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: tag.color || '#38BDF8' }}
                />
                <span className="font-mono text-xs font-medium text-[#F5F7FA]">
                  #{tag.name}
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#8B98A8]">
                {count} {count === 1 ? 'trade' : 'trades'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
