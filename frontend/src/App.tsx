import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <h1>Gold Analysis Core</h1>
      <div className="card">
        <p>黃金價格多維度決策輔助系統</p>
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
      </div>
      <p className="read-the-docs">
        黃金價格多維度決策輔助系統核心功能開發中...
      </p>
    </div>
  )
}

export default App
