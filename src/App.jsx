import { blockCategories, parameterOptions } from './blockData.js'

function PromptPreview() {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          생성된 프롬프트
        </span>
        <button className="text-xs text-gray-500 border border-gray-600 rounded px-2 py-1 cursor-not-allowed opacity-50">
          복사
        </button>
      </div>
      <p className="text-gray-500 italic text-sm">
        ✨ 왼쪽에서 속성을 선택하면 프롬프트가 여기에 표시됩니다
      </p>
    </div>
  )
}

function CategoryBlock({ category }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{category.emoji}</span>
        <div>
          <h3 className="text-sm font-semibold text-gray-200">{category.category}</h3>
          <p className="text-xs text-gray-500">{category.description}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {category.attributes.map((attr) => (
          <button
            key={attr}
            className="text-xs px-2.5 py-1 rounded-full border border-gray-600 text-gray-300
                       bg-gray-800 hover:border-indigo-500 hover:text-indigo-300
                       hover:bg-indigo-950 transition-colors cursor-not-allowed"
            title="2단계에서 클릭 기능이 추가됩니다"
          >
            {attr}
          </button>
        ))}
      </div>
    </div>
  )
}

function LeftPanel() {
  return (
    <aside className="w-80 min-w-72 bg-gray-800 border-r border-gray-700 overflow-y-auto flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-sm font-bold text-white">블럭 팔레트</h2>
        <p className="text-xs text-gray-500 mt-0.5">속성을 클릭해 프롬프트에 추가하세요</p>
      </div>
      <div className="p-4 flex-1">
        {blockCategories.map((cat) => (
          <CategoryBlock key={cat.id} category={cat} />
        ))}
      </div>
    </aside>
  )
}

function SelectedBlock({ category }) {
  return (
    <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
      <div className="flex items-center gap-2 mb-1">
        <span>{category.emoji}</span>
        <span className="text-xs font-semibold text-gray-300">{category.category}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        <span className="text-xs px-2 py-0.5 bg-indigo-900 text-indigo-200 rounded-full border border-indigo-700">
          (비어있음)
        </span>
      </div>
    </div>
  )
}

function RightPanel() {
  return (
    <aside className="w-72 min-w-60 bg-gray-800 border-l border-gray-700 overflow-y-auto flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-sm font-bold text-white">선택된 조합</h2>
        <p className="text-xs text-gray-500 mt-0.5">선택한 속성이 여기에 쌓입니다</p>
      </div>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-600 rounded-xl">
          <div className="text-center">
            <p className="text-gray-500 text-sm">아직 선택된 속성이 없습니다</p>
            <p className="text-gray-600 text-xs mt-1">← 왼쪽에서 속성을 선택하세요</p>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
            파라미터
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {parameterOptions.map((param) => (
              <button
                key={param.id}
                className="text-xs px-2 py-1 rounded border border-gray-600 text-gray-400
                           bg-gray-700 font-mono cursor-not-allowed opacity-60"
                title="2단계에서 활성화됩니다"
              >
                {param.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-700">
        <button className="w-full py-2 px-4 bg-indigo-600 text-white text-sm font-semibold
                           rounded-lg opacity-50 cursor-not-allowed">
          프롬프트 생성
        </button>
      </div>
    </aside>
  )
}

export default function App() {
  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* 헤더 */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-lg">
          ✨
        </div>
        <div>
          <h1 className="text-base font-bold text-white">Midjourney 프롬프트 생성기</h1>
          <p className="text-xs text-gray-400">블럭을 조합해 완벽한 프롬프트를 만드세요</p>
        </div>
        <div className="ml-auto text-xs text-gray-600 border border-gray-700 rounded px-2 py-1">
          1단계: 화면 골격
        </div>
      </header>

      {/* 프롬프트 미리보기 */}
      <div className="px-6 py-3 bg-gray-850 border-b border-gray-700 shrink-0 bg-gray-900">
        <PromptPreview />
      </div>

      {/* 메인 3분할 영역 */}
      <div className="flex flex-1 overflow-hidden">
        <LeftPanel />

        {/* 중앙 캔버스 영역 */}
        <main className="flex-1 bg-gray-900 overflow-y-auto flex flex-col items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">🎨</div>
            <h2 className="text-xl font-bold text-gray-200 mb-2">프롬프트 캔버스</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              왼쪽 팔레트에서 속성을 선택하면<br />
              여기에 조합된 블럭이 표시됩니다
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 text-left">
              {blockCategories.slice(0, 4).map((cat) => (
                <div key={cat.id} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                  <div className="text-2xl mb-1">{cat.emoji}</div>
                  <div className="text-xs font-semibold text-gray-300">{cat.category}</div>
                  <div className="text-xs text-gray-500">{cat.attributes.length}개 속성</div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-gray-600">
              총 {blockCategories.length}개 카테고리 · {blockCategories.reduce((acc, c) => acc + c.attributes.length, 0)}개 속성
            </p>
          </div>
        </main>

        <RightPanel />
      </div>
    </div>
  )
}
