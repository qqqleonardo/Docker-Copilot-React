import React, { useState, useEffect } from 'react'
import {
  X,
  RefreshCw,
  FileText,
  ExternalLink,
  AlertCircle,
  Tag,
  Info
} from 'lucide-react'
import { imageAPI } from '../api/client.js'
import { cn } from '../utils/cn.js'

// 轻量渲染 Release 说明中的常见 Markdown（标题/列表/加粗/代码），不引入额外依赖
function renderMarkdownLine(line, key) {
  const heading = line.match(/^(#{1,6})\s+(.*)$/)
  if (heading) {
    return (
      <p key={key} className="font-semibold text-gray-900 dark:text-white mt-2 first:mt-0">
        {heading[2]}
      </p>
    )
  }
  if (/^\s*[-*+]\s+/.test(line)) {
    return (
      <p key={key} className="pl-3 text-gray-700 dark:text-gray-300">
        • {line.replace(/^\s*[-*+]\s+/, '')}
      </p>
    )
  }
  if (/^\s*\d+\.\s+/.test(line)) {
    return (
      <p key={key} className="pl-3 text-gray-700 dark:text-gray-300">
        {line.trim()}
      </p>
    )
  }
  // 行内加粗与代码
  const parts = []
  let rest = line
  let idx = 0
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let match
  let last = 0
  while ((match = pattern.exec(rest)) !== null) {
    if (match.index > last) {
      parts.push(<span key={`${key}-t${idx++}`}>{rest.slice(last, match.index)}</span>)
    }
    if (match[0].startsWith('**')) {
      parts.push(<strong key={`${key}-b${idx++}`}>{match[0].slice(2, -2)}</strong>)
    } else {
      parts.push(
        <code key={`${key}-c${idx++}`} className="px-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
          {match[0].slice(1, -1)}
        </code>
      )
    }
    last = match.index + match[0].length
  }
  if (last < rest.length) {
    parts.push(<span key={`${key}-t${idx++}`}>{rest.slice(last)}</span>)
  }
  if (parts.length === 0) return <span key={key} className="block h-2" />
  return (
    <p key={key} className="text-gray-700 dark:text-gray-300">
      {parts}
    </p>
  )
}

// 更新说明弹窗：展示镜像源仓库最近的 GitHub Release 更新内容
function ChangelogModal({ container, onClose }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setData(null)

    imageAPI.getChangelog(container.id)
      .then((response) => {
        if (cancelled) return
        if (response.data.code === 200 || response.data.code === 0) {
          setData(response.data.data || {})
        } else {
          setError(response.data.msg || '获取更新说明失败')
        }
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.response?.data?.msg || err.message || '网络错误，获取更新说明失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [container.id])

  const releases = data?.releases || []
  const hasRepo = Boolean(data?.repo)
  const isCommits = data?.kind === 'commits'

  const introText = !hasRepo
    ? ''
    : isCommits
      ? `该仓库（${data.repo}）未使用 Releases 发布更新说明，以下为最近的提交记录：`
      : `以下为源仓库 ${data.repo} 最近的发布说明：`

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[85vh] flex flex-col">
        {/* 弹窗头部 */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                更新说明
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {container.name}
                {data?.currentVersion && ` · 当前版本: ${data.currentVersion}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 弹窗内容 */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-500 dark:text-gray-400">
              <RefreshCw className="h-8 w-8 animate-spin mb-3" />
              <span className="text-sm">正在获取更新说明...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mb-3" />
              <p className="text-sm text-red-600 dark:text-red-400 whitespace-pre-wrap">{error}</p>
            </div>
          ) : !hasRepo ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Info className="h-8 w-8 text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                该镜像未提供 GitHub 源仓库信息，无法获取更新说明。
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                可以到镜像仓库页面查看该镜像的说明文档。
              </p>
            </div>
          ) : releases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Info className="h-8 w-8 text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                源仓库 {data.repo} 暂无发布说明（Releases）。
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {introText}
              </p>
              {releases.map((release, index) => (
                <div
                  key={`${release.tagName}-${index}`}
                  className={cn(
                    "border rounded-xl overflow-hidden",
                    index === 0
                      ? "border-primary-200 dark:border-primary-800"
                      : "border-gray-200 dark:border-gray-700"
                  )}
                >
                  <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Tag className="h-4 w-4 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {release.name || release.tagName}
                        </span>
                      </div>
                      {release.publishedAt && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                          {release.publishedAt.split('T')[0]}
                        </span>
                      )}
                    </div>
                    {release.name && release.tagName && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 inline-block">
                        {release.tagName}
                      </span>
                    )}
                  </div>
                  {release.body && (
                    <div className="px-4 py-3 text-xs leading-relaxed space-y-1 max-h-56 overflow-y-auto">
                      {release.body.split(/\r?\n/).map((line, i) => renderMarkdownLine(line, i))}
                    </div>
                  )}
                  {release.url && (
                    <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700/50">
                      <a
                        href={release.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        在 GitHub 查看原文
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChangelogModal
