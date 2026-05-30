import { useState, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { blockCategories, parameterOptions } from './blockData.js'

let _id = 0
function genId() { return `chip-${++_id}` }

function buildPrompt(prefix, blockOrder, blocks, params) {
  const parts = blockOrder
    .map((catId) => {
      const block = blocks[catId]
      return block && block.length > 0 ? block.map((item) => item.value).join(', ') : null
    })
    .filter(Boolean)
  if (prefix.trim()) parts.unshift(prefix.trim())
  const paramStr = params.length > 0 ? ' ' + params.join(' ') : ''
  return parts.length > 0 ? parts.join(', ') + paramStr : ''
}

// ─── 블럭 레벨 소터블 ───────────────────────────────────────────────────────
function SortableBlock({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
    opacity: isDragging ? 0.55 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {children({ dragHandleListeners: listeners, isDragging })}
    </div>
  )
}

// ─── 칩 레벨 소터블 ─────────────────────────────────────────────────────────
function SortableChip({ id, item, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  const isCustom = item.type === 'custom'
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
    opacity: isDragging ? 0.45 : 1,
  }

  return (
    <span
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border
        select-none touch-none
        ${isCustom
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-indigo-50 text-indigo-700 border-indigo-200'}
        ${isDragging ? 'shadow-lg' : 'cursor-grab active:cursor-grabbing'}`}
    >
      {item.value}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onRemove}
        className={`ml-0.5 leading-none font-bold
          ${isCustom ? 'text-amber-400 hover:text-amber-700' : 'text-indigo-400 hover:text-indigo-700'}`}
        aria-label={`${item.value} 삭제`}
      >
        ×
      </button>
    </span>
  )
}

// ─── 프롬프트 미리보기 ───────────────────────────────────────────────────────
function PromptPreview({ prompt }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    if (!prompt) return
    navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          생성된 프롬프트
        </span>
        <button
          onClick={handleCopy}
          disabled={!prompt}
          className={`text-xs border rounded px-2 py-1 transition-colors
            ${prompt
              ? 'border-gray-300 text-gray-600 hover:border-indigo-400 hover:text-indigo-600 cursor-pointer'
              : 'border-gray-200 text-gray-300 cursor-not-allowed'}`}
        >
          {copied ? '복사됨!' : '복사'}
        </button>
      </div>
      {prompt ? (
        <p className="text-gray-800 text-sm leading-relaxed font-mono break-all">{prompt}</p>
      ) : (
        <p className="text-gray-400 italic text-sm">
          왼쪽에서 속성을 선택하면 프롬프트가 여기에 표시됩니다
        </p>
      )}
    </div>
  )
}

// ─── 좌측 팔레트 ─────────────────────────────────────────────────────────────
function CategoryBlock({ category, onSelect }) {
  return (
    <div className="mb-5">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-gray-700">{category.category}</h3>
        <p className="text-xs text-gray-400">{category.description}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {category.attributes.map((attr) => (
          <button
            key={attr}
            onClick={() => onSelect(category.id, attr)}
            className="text-xs px-2.5 py-1 rounded-full border border-gray-300 text-gray-600
                       bg-white hover:border-indigo-400 hover:text-indigo-600
                       hover:bg-indigo-50 transition-colors cursor-pointer"
          >
            {attr}
          </button>
        ))}
      </div>
    </div>
  )
}

function LeftPanel({ onSelect }) {
  return (
    <aside className="w-80 min-w-72 bg-gray-50 border-r border-gray-200 overflow-y-auto flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-sm font-bold text-gray-800">블럭 팔레트</h2>
        <p className="text-xs text-gray-400 mt-0.5">속성을 클릭해 프롬프트에 추가하세요</p>
      </div>
      <div className="p-4 flex-1">
        {blockCategories.map((cat) => (
          <CategoryBlock key={cat.id} category={cat} onSelect={onSelect} />
        ))}
      </div>
    </aside>
  )
}

// ─── 우측 블럭 카드 (칩 DnD 포함) ───────────────────────────────────────────
function SelectedCategoryBlock({ category, selected, onRemove, onClear, onAddCustom, onReorderChips, dragHandleListeners, isDragging }) {
  const [input, setInput] = useState('')

  const chipSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function handleChipDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    const oldIdx = selected.findIndex((item) => item.id === active.id)
    const newIdx = selected.findIndex((item) => item.id === over.id)
    onReorderChips(category.id, arrayMove(selected, oldIdx, newIdx))
  }

  function handleAdd() {
    const trimmed = input.trim()
    if (!trimmed) return
    onAddCustom(category.id, trimmed)
    setInput('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleAdd()
  }

  return (
    <div className={`bg-white rounded-lg p-3 border transition-shadow
      ${isDragging ? 'border-indigo-300 shadow-xl' : 'border-gray-200'}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <button
            {...dragHandleListeners}
            className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing
                       touch-none px-0.5 text-base leading-none select-none"
            aria-label="블럭 순서 변경"
          >
            ≡
          </button>
          <span className="text-xs font-semibold text-gray-700">{category.category}</span>
        </div>
        {selected.length > 0 && (
          <button
            onClick={() => onClear(category.id)}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            전체 비우기
          </button>
        )}
      </div>

      {/* 칩 영역 — 내부 DnD */}
      <DndContext
        sensors={chipSensors}
        collisionDetection={closestCenter}
        onDragEnd={handleChipDragEnd}
      >
        <SortableContext
          items={selected.map((item) => item.id)}
          strategy={rectSortingStrategy}
        >
          <div className="flex flex-wrap gap-1.5 min-h-5">
            {selected.length === 0 && (
              <p className="text-xs text-gray-300 italic">선택된 속성 없음</p>
            )}
            {selected.map((item) => (
              <SortableChip
                key={item.id}
                id={item.id}
                item={item}
                onRemove={() => onRemove(category.id, item.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* 직접 입력 */}
      <div className="flex gap-1.5 mt-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="직접 입력..."
          className="flex-1 text-xs px-2 py-1 rounded border border-gray-200 text-gray-700
                     placeholder-gray-300 bg-gray-50
                     focus:outline-none focus:border-amber-400 focus:bg-white transition-colors"
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim()}
          className="text-xs px-2 py-1 rounded border border-amber-300 text-amber-600
                     bg-amber-50 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed
                     transition-colors shrink-0"
        >
          추가
        </button>
      </div>
    </div>
  )
}

// ─── 우측 패널 (블럭 DnD 포함) ───────────────────────────────────────────────
function RightPanel({ prefix, onPrefixChange, blockOrder, blocks, params,
  onRemove, onClear, onToggleParam, onAddCustom, onReorderBlocks, onReorderChips }) {

  const blockSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function handleBlockDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    const oldIdx = blockOrder.indexOf(active.id)
    const newIdx = blockOrder.indexOf(over.id)
    onReorderBlocks(arrayMove(blockOrder, oldIdx, newIdx))
  }

  return (
    <aside className="w-72 min-w-60 bg-gray-50 border-l border-gray-200 overflow-y-auto flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-sm font-bold text-gray-800">선택된 조합</h2>
        <p className="text-xs text-gray-400 mt-0.5">≡ 드래그로 순서를 바꿀 수 있습니다</p>
      </div>

      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
          고정 접두어
        </label>
        <input
          type="text"
          value={prefix}
          onChange={(e) => onPrefixChange(e.target.value)}
          placeholder="예: Korean, East Asian"
          className="w-full text-xs px-2.5 py-1.5 rounded border border-gray-300
                     text-gray-700 placeholder-gray-300 bg-gray-50
                     focus:outline-none focus:border-indigo-400 focus:bg-white transition-colors"
        />
        <p className="text-xs text-gray-300 mt-1">프롬프트 맨 앞에 항상 붙습니다</p>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-2">
        <DndContext
          sensors={blockSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleBlockDragEnd}
        >
          <SortableContext items={blockOrder} strategy={verticalListSortingStrategy}>
            {blockOrder.map((catId) => {
              const cat = blockCategories.find((c) => c.id === catId)
              return (
                <SortableBlock key={catId} id={catId}>
                  {({ dragHandleListeners, isDragging }) => (
                    <SelectedCategoryBlock
                      category={cat}
                      selected={blocks[catId] || []}
                      onRemove={onRemove}
                      onClear={onClear}
                      onAddCustom={onAddCustom}
                      onReorderChips={onReorderChips}
                      dragHandleListeners={dragHandleListeners}
                      isDragging={isDragging}
                    />
                  )}
                </SortableBlock>
              )
            })}
          </SortableContext>
        </DndContext>

        <div className="mt-2">
          <h3 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
            파라미터
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {parameterOptions.map((param) => {
              const active = params.includes(param.label)
              return (
                <button
                  key={param.id}
                  onClick={() => onToggleParam(param.label)}
                  className={`text-xs px-2 py-1 rounded border font-mono transition-colors
                    ${active
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 bg-white text-gray-500 hover:border-indigo-300 hover:text-indigo-500'}`}
                >
                  {param.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </aside>
  )
}

// ─── 앱 루트 ─────────────────────────────────────────────────────────────────
export default function App() {
  const [prefix, setPrefix] = useState('Korean, East Asian')
  const [blockOrder, setBlockOrder] = useState(blockCategories.map((c) => c.id))
  const [blocks, setBlocks] = useState({})
  const [params, setParams] = useState([])

  function handleSelect(categoryId, attr) {
    setBlocks((prev) => ({
      ...prev,
      [categoryId]: [...(prev[categoryId] || []), { id: genId(), value: attr, type: 'preset' }],
    }))
  }

  function handleAddCustom(categoryId, value) {
    setBlocks((prev) => ({
      ...prev,
      [categoryId]: [...(prev[categoryId] || []), { id: genId(), value, type: 'custom' }],
    }))
  }

  function handleRemove(categoryId, chipId) {
    setBlocks((prev) => ({
      ...prev,
      [categoryId]: prev[categoryId].filter((item) => item.id !== chipId),
    }))
  }

  function handleClear(categoryId) {
    setBlocks((prev) => ({ ...prev, [categoryId]: [] }))
  }

  function handleToggleParam(label) {
    setParams((prev) =>
      prev.includes(label) ? prev.filter((p) => p !== label) : [...prev, label]
    )
  }

  function handleReorderBlocks(newOrder) {
    setBlockOrder(newOrder)
  }

  function handleReorderChips(categoryId, newItems) {
    setBlocks((prev) => ({ ...prev, [categoryId]: newItems }))
  }

  const prompt = useMemo(
    () => buildPrompt(prefix, blockOrder, blocks, params),
    [prefix, blockOrder, blocks, params]
  )

  return (
    <div className="h-screen flex flex-col bg-gray-100 text-gray-900 overflow-hidden">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg" />
        <div>
          <h1 className="text-base font-bold text-gray-900">Midjourney 프롬프트 생성기</h1>
          <p className="text-xs text-gray-400">블럭을 조합해 완벽한 프롬프트를 만드세요</p>
        </div>
      </header>

      <div className="px-6 py-3 bg-gray-100 border-b border-gray-200 shrink-0">
        <PromptPreview prompt={prompt} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <LeftPanel onSelect={handleSelect} />

        <main className="flex-1 bg-gray-100 overflow-y-auto flex flex-col items-center justify-center p-8">
          <div className="text-center max-w-md">
            <h2 className="text-xl font-bold text-gray-700 mb-2">프롬프트 캔버스</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              왼쪽 팔레트에서 속성을 선택하거나<br />
              우측 입력칸에 직접 타이핑하세요
            </p>
            <div className="mt-6 flex gap-3 text-left">
              <div className="flex-1 bg-white rounded-lg p-3 border border-indigo-200">
                <div className="text-xs font-semibold text-indigo-700 mb-0.5">선택형</div>
                <div className="text-xs text-gray-400">왼쪽 팔레트 클릭</div>
              </div>
              <div className="flex-1 bg-white rounded-lg p-3 border border-amber-200">
                <div className="text-xs font-semibold text-amber-700 mb-0.5">입력형</div>
                <div className="text-xs text-gray-400">우측 직접 입력</div>
              </div>
              <div className="flex-1 bg-white rounded-lg p-3 border border-gray-200">
                <div className="text-xs font-semibold text-gray-700 mb-0.5">순서 변경</div>
                <div className="text-xs text-gray-400">≡ 드래그</div>
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-400">
              총 {blockCategories.length}개 카테고리 · {blockCategories.reduce((acc, c) => acc + c.attributes.length, 0)}개 속성
            </p>
          </div>
        </main>

        <RightPanel
          prefix={prefix}
          onPrefixChange={setPrefix}
          blockOrder={blockOrder}
          blocks={blocks}
          params={params}
          onRemove={handleRemove}
          onClear={handleClear}
          onToggleParam={handleToggleParam}
          onAddCustom={handleAddCustom}
          onReorderBlocks={handleReorderBlocks}
          onReorderChips={handleReorderChips}
        />
      </div>
    </div>
  )
}
