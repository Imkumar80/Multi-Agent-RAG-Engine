import { useState } from 'react'
import axios from 'axios'
import { Search as SearchIcon, FileText } from 'lucide-react'
import MLChat from '../components/MLChat'
import { searchPapersApi } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import type { MlResearchPaper, MlResearchSearchResponse, MlResearchSource } from '../types/mlApi'

const SEARCH_LIMIT = 20

function getErrorMessage(error: unknown, fallback: string): string {
	if (axios.isAxiosError(error)) {
		const responseData = error.response?.data
		if (responseData && typeof responseData === 'object' && 'detail' in responseData) {
			const detail = (responseData as { detail?: unknown }).detail
			if (typeof detail === 'string' && detail.trim()) {
				return detail
			}
		}
		if (typeof error.message === 'string' && error.message.trim()) {
			return error.message
		}
	}

	if (error instanceof Error && error.message.trim()) {
		return error.message
	}

	return fallback
}

function parsePaperId(paperId: unknown): number | null {
	if (typeof paperId === 'number' && Number.isInteger(paperId) && paperId > 0) {
		return paperId
	}

	if (typeof paperId === 'string') {
		const normalized = paperId.trim()
		if (!/^\d+$/.test(normalized)) {
			return null
		}
		const parsed = Number(normalized)
		if (Number.isInteger(parsed) && parsed > 0) {
			return parsed
		}
	}

	return null
}

export default function SearchPage() {
	const { id: userId } = useAuth()
	const [query, setQuery] = useState('')
	const [source, setSource] = useState<MlResearchSource>('arxiv')
	const [results, setResults] = useState<MlResearchSearchResponse | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [chatPaper, setChatPaper] = useState<MlResearchPaper | null>(null)
	const [chatPaperId, setChatPaperId] = useState<number | null>(null)
	const [source, setSource] = useState('arxiv')
	const [results, setResults] = useState<SearchResponse | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [chatPaper, setChatPaper] = useState<Paper | null>(null)
	const [chatPaperId, setChatPaperId] = useState<number | null>(null)
	const [savingForChatPaperId, setSavingForChatPaperId] = useState<string | number | null>(null)

	const handleSearch = async (e: React.FormEvent) => {
		e.preventDefault()
		const trimmedQuery = query.trim()
		if (!trimmedQuery) return

		setLoading(true)
		setError('')
		setResults(null)

		try {
			const data = await searchPapersApi({
				query: trimmedQuery,
				source,
				limit: SEARCH_LIMIT,
				offset: 0
			})
			setResults(data)
		} catch (err: unknown) {
			setError(getErrorMessage(err, 'Failed to search papers. Please make sure the ML backend is running on port 8001.'))
			let data: SearchResponse
			switch (source) {
				case 'arxiv':
					data = await searchArxivApi(query, 20, 0)
					break
				case 'semantic_scholar':
					data = await searchSemanticScholarApi(query, 20, 0)
					break
				case 'crossref':
					data = await searchCrossrefApi(query, 20)
					break
				case 'springer':
					data = await searchSpringerApi(query, 20)
					break
				default:
					data = await searchPapersApi({ query, source, limit: 20, offset: 0 })
			}
			setResults(data)
		} catch (err: any) {
			const errorMsg = err?.response?.data?.detail || err?.message || 'Failed to search papers. Please make sure the ML backend is running on port 8001.'
			setError(errorMsg)
			console.error('Search error:', err)
		} finally {
			setLoading(false)
		}
	}

	const handleChatWithPaper = (paper: MlResearchPaper) => {
		if (!userId) {
			setError('You must be logged in to start an ML chat session.')
			return
		}

		const parsedPaperId = parsePaperId(paper.paper_id)
		if (parsedPaperId === null) {
			setError('Selected paper is missing a valid paper_id from search results.')
			return
	const handleChatWithPaper = async (paper: Paper) => {
		const paperId = paper.paper_id || paper.id
		setSavingForChatPaperId(paperId)
		try {
			console.log('📄 Saving paper for chat:', paper.title)

			// Save the paper to the system first
			const savedPaper = await selectPaperApi({
				title: paper.title,
				authors: paper.authors,
				abstract: paper.abstract || paper.summary,
				summary: paper.summary || paper.abstract,
				url: paper.url || paper.pdf_url || '',
				source: paper.source,
				published_date: paper.published,
				content: paper.abstract || paper.summary
			})

			console.log('✅ Paper saved successfully:', savedPaper)

			if (!savedPaper.paper_id) {
				throw new Error('Backend did not return paper_id. Response: ' + JSON.stringify(savedPaper))
			}

			// Set the paper and its ID for chat
			setChatPaper(paper)
			const chatPaperIdNum = Number(savedPaper.paper_id)
			console.log('🔧 Setting chatPaperId:', chatPaperIdNum)
			setChatPaperId(chatPaperIdNum)
		} catch (err: any) {
			const errorMsg = err?.response?.data?.detail || err?.message || 'Failed to save paper for chat'
			setError(errorMsg)
			console.error('❌ Error saving paper for chat:', err)
			alert('Error: ' + errorMsg)
		} finally {
			setSavingForChatPaperId(null)
		}

		setError('')
		setChatPaper(paper)
		setChatPaperId(parsedPaperId)
	}

	return (
		<>
			<div className="min-h-screen bg-gray-50">
				<div className="container mx-auto px-4 py-8">
					{/* Header */}
					<div className="text-center mb-8">
						<h1 className="text-4xl font-bold text-gray-900 mb-2">
							Research Paper Search
						</h1>
						<p className="text-lg text-gray-600">
							Search through research papers from ArXiv, Semantic Scholar, CrossRef, and Springer
						</p>
					</div>

					{/* Search Form */}
					<div className="max-w-4xl mx-auto mb-8">
						<form onSubmit={handleSearch} className="bg-white rounded-lg shadow-md p-6">
							<div className="flex gap-4 mb-4">
								<div className="flex-1">
									<input
										type="text"
										value={query}
										onChange={(e) => setQuery(e.target.value)}
										placeholder="Enter your search query..."
										className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										disabled={loading}
									/>
								</div>
								<select
									value={source}
									onChange={(e) => setSource(e.target.value as MlResearchSource)}
									className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									disabled={loading}
									onChange={(e) => setSource(e.target.value)}
									className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								>
									<option value="arxiv">ArXiv</option>
									<option value="semantic_scholar">Semantic Scholar</option>
									<option value="crossref">CrossRef</option>
									<option value="springer">Springer</option>
								</select>
								<button
									type="submit"
									disabled={loading || !query.trim()}
									className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
								>
									<SearchIcon size={20} />
									{loading ? 'Searching...' : 'Search'}
								</button>
							</div>
						</form>
					</div>

					{/* Error Message */}
					{error && (
						<div className="max-w-4xl mx-auto mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
							{error}
						</div>
					)}

					{loading && (
						<div className="max-w-4xl mx-auto mb-6 p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg">
							Searching papers from {source.replace('_', ' ')}...
						</div>
					)}

					{results && (
						<div className="max-w-6xl mx-auto">
					{/* Results */}
					{results && (
						<div className="max-w-6xl mx-auto">
							{/* Search Stats */}
							<div className="bg-white rounded-lg shadow-md p-6 mb-6">
								<div className="flex items-center justify-between">
									<div>
										<h2 className="text-xl font-semibold text-gray-900">
											Search Results for "{query}"
										</h2>
										<p className="text-gray-600">
											Found {results.total} papers from {results.source}
										</p>
									</div>
									<div className="flex items-center gap-4 text-sm text-gray-500">
										<div className="flex items-center gap-1">
											<FileText size={16} />
											<span>{results.source.toUpperCase()}</span>
											<span>{source.toUpperCase()}</span>
										</div>
									</div>
								</div>
							</div>

							{results.papers.length > 0 ? (
								<div className="space-y-4">
									{results.papers.map((paper, index) => {
										const paperId = parsePaperId(paper.paper_id)
										return (
											<div key={paperId ?? index} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
												<div className="flex items-start justify-between mb-3">
													<div className="flex-1">
														<div className="flex items-center gap-3 mb-2">
															<span className="text-sm font-medium text-blue-600">
																#{index + 1}
															</span>
															<span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
																{paper.source}
															</span>
														</div>
														<h3 className="text-xl font-semibold text-gray-900 mb-2">
															{paper.title}
														</h3>
														<div className="text-sm text-gray-600 mb-3">
															Authors: {paper.authors.join(', ')}
														</div>
													</div>
													<div className="text-right">
														<div className="text-sm text-gray-500">Paper ID</div>
														<div className="text-lg font-semibold text-gray-900">
															{paperId ?? 'N/A'}
														</div>
													</div>
												</div>

												<div className="border-t pt-4">
													<p className="text-gray-700 leading-relaxed">
														{paper.abstract || 'No abstract available for this paper.'}
													</p>
												</div>

												<div className="mt-4 pt-4 border-t">
													<div className="flex items-center justify-between">
														<a
															href={paper.url}
															target="_blank"
															rel="noopener noreferrer"
															className="text-blue-600 hover:text-blue-800 text-sm font-medium"
														>
															View Original Paper →
														</a>
														<button
															onClick={() => handleChatWithPaper(paper)}
															disabled={paperId === null}
															className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
															title={paperId === null ? 'This result has no paper_id and cannot start chat.' : 'Start chatting with this paper'}
														>
															Chat with Paper
														</button>
													</div>
												</div>
											</div>
										)
									})}
							{/* Results List */}
							{results.papers.length > 0 ? (
								<div className="space-y-4">
									{results.papers.map((paper, index) => (
										<div key={paper.paper_id || paper.id || index} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
											<div className="flex items-start justify-between mb-3">
												<div className="flex-1">
													<div className="flex items-center gap-3 mb-2">
														<span className="text-sm font-medium text-blue-600">
															#{index + 1}
														</span>
														<span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
															{paper.source}
														</span>
													</div>
													<h3 className="text-xl font-semibold text-gray-900 mb-2">
														{paper.title}
													</h3>
													<div className="text-sm text-gray-600 mb-3">
														Authors: {paper.authors.join(', ')}
													</div>
												</div>
												<div className="text-right">
													<div className="text-sm text-gray-500">Paper ID</div>
													<div className="text-lg font-semibold text-gray-900">
														{paper.paper_id || paper.id || `#${index + 1}`}
													</div>
												</div>
											</div>

											<div className="border-t pt-4">
												<p className="text-gray-700 leading-relaxed">
													{paper.abstract || paper.summary}
												</p>
											</div>

											<div className="mt-4 pt-4 border-t">
												<div className="flex items-center justify-between">
													<a
														href={paper.url || paper.pdf_url}
														target="_blank"
														rel="noopener noreferrer"
														className="text-blue-600 hover:text-blue-800 text-sm font-medium"
													>
														View Original Paper →
													</a>
													<button
														onClick={() => handleChatWithPaper(paper)}
														disabled={savingForChatPaperId === (paper.paper_id || paper.id)}
														className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
														title={savingForChatPaperId === (paper.paper_id || paper.id) ? 'Saving paper for chat...' : 'Start chatting with this paper'}
													>
														{savingForChatPaperId === (paper.paper_id || paper.id) ? 'Preparing...' : 'Chat with Paper'}
													</button>
												</div>
											</div>
										</div>
									))}
								</div>
							) : (
								<div className="text-center py-12">
									<SearchIcon size={48} className="mx-auto text-gray-400 mb-4" />
									<h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
									<p className="text-gray-500">
										Try adjusting your search query or selecting a different source.
									</p>
								</div>
							)}
						</div>
					)}

					{/* Empty State */}
					{!results && !loading && (
						<div className="text-center py-16">
							<SearchIcon size={64} className="mx-auto text-gray-300 mb-4" />
							<h3 className="text-xl font-medium text-gray-900 mb-2">
								Start searching for research papers
							</h3>
							<p className="text-gray-500 max-w-md mx-auto">
								Enter a search query above to find relevant research papers from academic sources.
							</p>
						</div>
					)}
				</div>
			</div>

			{chatPaper && chatPaperId !== null && userId && (
			{/* ML Chat Modal */}
			{chatPaper && chatPaperId && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-3/4 flex flex-col">
						<div className="flex items-center justify-between p-4 border-b">
							<h3 className="text-lg font-semibold">Chat with Paper</h3>
							<button
								onClick={() => {
									setChatPaper(null)
									setChatPaperId(null)
								}}
								className="text-gray-500 hover:text-gray-700"
							>
								✕
							</button>
						</div>
						<div className="flex-1">
							<MLChat
								paperId={chatPaperId}
								paperTitle={chatPaper.title}
								userId={userId}
								userId="test-user"
							/>
						</div>
					</div>
				</div>
			)}
		</>
	)
}