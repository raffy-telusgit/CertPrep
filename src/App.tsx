import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import ExamSelector from '@/components/ExamSelector'
import ExamRunner from '@/components/ExamRunner'
import ResultsScreen from '@/components/ResultsScreen'
import HistoryView from '@/components/HistoryView'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ExamSelector />} />
        <Route path="exam/:id" element={<ExamRunner />} />
        <Route path="results/:sessionId" element={<ResultsScreen />} />
        <Route path="history" element={<HistoryView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
