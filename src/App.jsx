import { useState, useEffect, useRef, useMemo } from 'react'
import { categorize, CAT_COLORS, CAT_BG } from './categories'
import SEED_DATA from './seedData'
import { Chart, registerables } from 'chart.js'
import styles from './App.module.css'

Chart.register(...registerables)

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY
if (!API_KEY) console.warn('[stocked-and-loaded] VITE_ANTHROPIC_API_KEY is not set — screenshot import is disabled')

const STORAGE_KEY = 'stocked_and_loaded_v1'
const CATEGORY_OVERRIDES_KEY = 'stocked_loaded_cat_overrides'
const TIME_RANGE_KEY = 'stocked_loaded_time_range'

function loadOrders() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : SEED_DATA
  } catch {
    return SEED_DATA
  }
}

function saveOrders(orders) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders))
  } catch {}
}

function loadOverrides() {
  try {
    const saved = localStorage.getItem(CATEGORY_OVERRIDES_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

function loadTimeRangePrefs() {
  try {
    const saved = localStorage.getItem(TIME_RANGE_KEY)
    return saved ? JSON.parse(saved) : { range: 'all', month: '', from: '', to: '' }
  } catch {
    return { range: 'all', month: '', from: '', to: '' }
  }
}

function parseDate(str) {
  return new Date(str.replace(/–.*/, '').trim())
}

function parseUnitPrice(str) {
  if (!str) return 0
  const m = str.match(/\$?([\d.]+)/)
  return m ? parseFloat(m[1]) : 0
}

function getDateBounds(timeRange, customFrom, customTo, timeRangeMonth) {
  if (timeRange === 'all') return null
  const now = new Date()
  if (timeRange === '30' || timeRange === '60' || timeRange === '90') {
    const from = new Date(now)
    from.setDate(from.getDate() - parseInt(timeRange))
    return { from, to: now }
  }
  if (timeRange === 'month' && timeRangeMonth) {
    const [yr, mo] = timeRangeMonth.split('-').map(Number)
    return { from: new Date(yr, mo - 1, 1), to: new Date(yr, mo, 0, 23, 59, 59) }
  }
  if (timeRange === 'custom' && customFrom && customTo) {
    return {
      from: new Date(customFrom + 'T00:00:00'),
      to: new Date(customTo + 'T23:59:59'),
    }
  }
  return null
}

function inRange(dateStr, bounds) {
  if (!bounds) return true
  const d = parseDate(dateStr)
  return d >= bounds.from && d <= bounds.to
}

function computeInsights(orders, allItems) {
  const now = new Date()
  const curY = now.getFullYear()
  const curM = now.getMonth()
  const prevY = curM === 0 ? curY - 1 : curY
  const prevM = curM === 0 ? 11 : curM - 1

  const inMonth = (dateStr, y, m) => {
    const d = parseDate(dateStr)
    return d.getFullYear() === y && d.getMonth() === m
  }

  const currentMonth = orders
    .filter(o => inMonth(o.date, curY, curM))
    .reduce((s, o) => s + (o.totalAmount || 0), 0)
  const prevMonth = orders
    .filter(o => inMonth(o.date, prevY, prevM))
    .reduce((s, o) => s + (o.totalAmount || 0), 0)
  const momDelta = prevMonth > 0 ? currentMonth - prevMonth : null

  const priceMapByKey = {}
  allItems.forEach(i => {
    const k = i.productId || i.name
    if (!priceMapByKey[k]) priceMapByKey[k] = { name: i.name, entries: [] }
    priceMapByKey[k].entries.push({ date: i.orderDate, unitPrice: i.unitPrice })
  })

  const allChanges = []
  Object.values(priceMapByKey).forEach(({ name, entries }) => {
    if (entries.length < 2) return
    entries.sort((a, b) => parseDate(a.date) - parseDate(b.date))
    const prev = parseUnitPrice(entries[entries.length - 2].unitPrice)
    const last = parseUnitPrice(entries[entries.length - 1].unitPrice)
    if (prev <= 0 || last <= 0) return
    const diff = last - prev
    if (Math.abs(diff) < 0.01) return
    const pct = Math.round(Math.abs(diff / prev) * 100)
    allChanges.push({ name, diff, pct, prev, last })
  })

  const priceChanges = allChanges.length
  const priceJumps = allChanges.filter(c => c.diff > 0).sort((a, b) => b.diff - a.diff)
  const priceDrops = allChanges.filter(c => c.diff < 0).sort((a, b) => a.diff - b.diff)
  const biggestJump = priceJumps[0] || null
  const biggestDrop = priceDrops[0] || null

  const curCatTotals = {}
  const prevCatTotals = {}
  allItems.forEach(i => {
    if (inMonth(i.orderDate, curY, curM)) curCatTotals[i.cat] = (curCatTotals[i.cat] || 0) + i.price
    if (inMonth(i.orderDate, prevY, prevM)) prevCatTotals[i.cat] = (prevCatTotals[i.cat] || 0) + i.price
  })

  const allCatKeys = new Set([...Object.keys(curCatTotals), ...Object.keys(prevCatTotals)])
  const catDeltas = [...allCatKeys].map(cat => ({
    cat,
    cur: curCatTotals[cat] || 0,
    prev: prevCatTotals[cat] || 0,
    growth: (curCatTotals[cat] || 0) - (prevCatTotals[cat] || 0),
  })).sort((a, b) => Math.abs(b.growth) - Math.abs(a.growth))

  const categoryTrend = catDeltas.find(c => c.prev > 0) || null

  return { currentMonth, prevMonth, momDelta, priceChanges, biggestJump, biggestDrop, categoryTrend, priceJumps, priceDrops, catDeltas }
}

function PriceChips({ entries }) {
  return (
    <div className={styles.priceEntries}>
      {entries.map((e, i) => {
        const prev = entries[i - 1]
        const prevPrice = prev ? parseUnitPrice(prev.unitPrice) : 0
        const currPrice = parseUnitPrice(e.unitPrice)
        const hasDelta = prev && prevPrice > 0 && currPrice !== prevPrice
        const diff = hasDelta ? currPrice - prevPrice : 0
        const pct = hasDelta ? Math.round(Math.abs(diff / prevPrice) * 100) : 0
        const deltaStr = hasDelta
          ? `${diff > 0 ? '+' : '-'}$${Math.abs(diff).toFixed(2)} (${pct}%)`
          : null
        const isUp = diff > 0
        return (
          <div key={i} className={`${styles.priceChip} ${hasDelta ? (isUp ? styles.priceUp : styles.priceDown) : ''}`}>
            <span className={styles.priceDate}>{e.date.split(',')[0]}</span>
            <span className={styles.priceVal}>{e.unitPrice}</span>
            {deltaStr && (
              <span className={isUp ? styles.priceDeltaUp : styles.priceDeltaDown}>{deltaStr}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function PriceLineGraph({ entries }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || entries.length < 2) return
    chartRef.current?.destroy()
    const prices = entries.map(e => parseUnitPrice(e.unitPrice))
    const n = prices.length
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: entries.map(e => e.date.split(',')[0]),
        datasets: [{
          data: prices,
          borderColor: '#E1251B',
          borderWidth: 2,
          pointRadius: prices.map((_, i) => i === n - 1 ? 4 : 0),
          pointBackgroundColor: prices.map((_, i) => i === n - 1 ? '#E1251B' : 'transparent'),
          pointBorderColor: prices.map((_, i) => i === n - 1 ? '#FFFFFF' : 'transparent'),
          pointBorderWidth: 2,
          tension: 0.3,
          fill: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
        layout: { padding: { top: 10, bottom: 4, left: 2, right: 8 } },
      }
    })
    return () => { chartRef.current?.destroy() }
  }, [entries])

  if (entries.length < 2) return null
  return (
    <div style={{ position: 'relative', height: 90, marginBottom: 4 }}>
      <canvas ref={canvasRef} />
    </div>
  )
}

function PriceHistoryCard({ item }) {
  const [view, setView] = useState('graph')
  const { entries } = item
  const firstPrice = parseUnitPrice(entries[0]?.unitPrice)
  const lastEntry = entries[entries.length - 1]
  const lastPrice = parseUnitPrice(lastEntry?.unitPrice)
  const totalDiff = lastPrice - firstPrice
  const totalPct = firstPrice > 0 ? Math.round(Math.abs(totalDiff / firstPrice) * 100) : 0
  const totalDeltaStr = firstPrice > 0 && totalDiff !== 0
    ? `${totalDiff > 0 ? '+' : '-'}$${Math.abs(totalDiff).toFixed(2)} (${totalPct}%)`
    : null
  const isTotalUp = totalDiff > 0
  const prices = entries.map(e => parseUnitPrice(e.unitPrice))
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const minEntry = entries.findLast(e => parseUnitPrice(e.unitPrice) === minPrice)
  const maxEntry = entries.findLast(e => parseUnitPrice(e.unitPrice) === maxPrice)

  return (
    <div className={styles.card}>
      <div className={styles.phCardTop}>
        <p className={styles.priceItemName}>{item.name}</p>
        <div className={styles.phViewToggle}>
          <button
            className={`${styles.phToggleBtn} ${view === 'graph' ? styles.phToggleBtnActive : ''}`}
            onClick={() => setView('graph')}
          >Graph</button>
          <button
            className={`${styles.phToggleBtn} ${view === 'chips' ? styles.phToggleBtnActive : ''}`}
            onClick={() => setView('chips')}
          >Chips</button>
        </div>
      </div>
      {view === 'graph' && (
        <>
          <div className={styles.phHeroRow}>
            <div className={styles.phHeroCurrent}>
              <span className={styles.phHeroLabel}>Current</span>
              <span className={styles.phHeroValue}>{lastEntry?.unitPrice || '—'}</span>
            </div>
            {totalDeltaStr && (
              <span className={`${styles.phDeltaChip} ${isTotalUp ? styles.phDeltaUp : styles.phDeltaDown}`}>
                {totalDeltaStr}
              </span>
            )}
            <div className={styles.phHeroStat}>
              <span className={styles.phHeroLabel}>Bought</span>
              <span className={styles.phHeroCount}>×{entries.length}</span>
            </div>
            <div className={styles.phStatBox}>
              <span className={styles.phStatLabel}>Low</span>
              <span className={styles.phStatValue}>${minPrice.toFixed(2)}</span>
              <span className={styles.phStatDate}>{minEntry?.date.split(',')[0]}</span>
            </div>
            <div className={styles.phStatBox}>
              <span className={styles.phStatLabel}>High</span>
              <span className={styles.phStatValue}>${maxPrice.toFixed(2)}</span>
              <span className={styles.phStatDate}>{maxEntry?.date.split(',')[0]}</span>
            </div>
          </div>
          <PriceLineGraph entries={entries} />
          <details className={styles.phDetails}>
            <summary className={styles.phDetailsSummary}>Show all {entries.length} entries</summary>
            <PriceChips entries={entries} />
          </details>
        </>
      )}
      {view === 'chips' && <PriceChips entries={entries} />}
    </div>
  )
}

function TimeFilterBar({
  timeRange, setTimeRange,
  timeRangeMonth, setTimeRangeMonth,
  customFrom, setCustomFrom,
  customTo, setCustomTo,
  orderMonths,
  tab,
  timeFilteredOrders,
  timeFilteredItems,
  orders,
  allItems,
}) {
  const isFiltered = timeRange !== 'all'
  const monthLabel = m => {
    const [yr, mo] = m.split('-').map(Number)
    return new Date(yr, mo - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }
  return (
    <div className={styles.timeFilterBar}>
      <div className={styles.timeFilterPills}>
        {[['all','All'],['30','30d'],['60','60d'],['90','90d']].map(([val, label]) => (
          <button
            key={val}
            className={`${styles.timeFilterPill} ${timeRange === val ? styles.timeFilterPillActive : ''}`}
            onClick={() => setTimeRange(val)}
          >
            {label}
          </button>
        ))}
        <select
          className={`${styles.timeFilterPill} ${timeRange === 'month' ? styles.timeFilterPillActive : ''}`}
          value={timeRange === 'month' ? timeRangeMonth : ''}
          onChange={e => {
            if (e.target.value) { setTimeRangeMonth(e.target.value); setTimeRange('month') }
          }}
        >
          <option value="">Month…</option>
          {orderMonths.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
      </div>
      <div className={styles.timeFilterCustom}>
        <input
          type="date"
          className={styles.timeFilterDate}
          value={customFrom}
          onChange={e => {
            setCustomFrom(e.target.value)
            if (e.target.value && customTo) setTimeRange('custom')
          }}
        />
        <span className={styles.timeFilterDash}>–</span>
        <input
          type="date"
          className={styles.timeFilterDate}
          value={customTo}
          onChange={e => {
            setCustomTo(e.target.value)
            if (customFrom && e.target.value) setTimeRange('custom')
          }}
        />
      </div>
      {isFiltered && (
        <span className={styles.timeFilterIndicator}>
          {tab === 'items'
            ? `${timeFilteredItems.length} of ${allItems.length} items`
            : tab === 'overview'
            ? `${timeFilteredOrders.length} of ${orders.length} orders`
            : `${timeFilteredOrders.length} of ${orders.length} orders`}
        </span>
      )}
    </div>
  )
}

export default function App() {
  const [orders, setOrders] = useState(loadOrders)
  const [catOverrides, setCatOverrides] = useState(loadOverrides)
  const [tab, setTab] = useState('overview')
  const [expandedOrder, setExpandedOrder] = useState(null)
  const [filterCat, setFilterCat] = useState('All')
  const [itemSearch, setItemSearch] = useState('')
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [priceSearch, setPriceSearch] = useState('')
  const [importStatus, setImportStatus] = useState(null)
  const [showManual, setShowManual] = useState(false)
  const [manDate, setManDate] = useState('')
  const [manItems, setManItems] = useState([{ name: '', price: '', quantity: '1 each' }])
  const spendChartRef = useRef(null)
  const catChartRef = useRef(null)
  const spendChartInst = useRef(null)
  const catChartInst = useRef(null)

  const initPrefs = loadTimeRangePrefs()
  const [timeRange, setTimeRange] = useState(initPrefs.range)
  const [timeRangeMonth, setTimeRangeMonth] = useState(initPrefs.month)
  const [customFrom, setCustomFrom] = useState(initPrefs.from)
  const [customTo, setCustomTo] = useState(initPrefs.to)
  const [drilldownOrder, setDrilldownOrder] = useState(null)
  const [drilldownCat, setDrilldownCat] = useState(null)

  useEffect(() => { saveOrders(orders) }, [orders])

  useEffect(() => {
    try {
      localStorage.setItem(TIME_RANGE_KEY, JSON.stringify({
        range: timeRange, month: timeRangeMonth, from: customFrom, to: customTo
      }))
    } catch {}
  }, [timeRange, timeRangeMonth, customFrom, customTo])

  useEffect(() => {
    setDrilldownOrder(null)
    setDrilldownCat(null)
  }, [timeRange, timeRangeMonth, customFrom, customTo])

  useEffect(() => {
    setDrilldownOrder(null)
    setDrilldownCat(null)
  }, [tab])

  function setCatOverride(key, cat) {
    setCatOverrides(prev => {
      const next = { ...prev, [key]: cat }
      try { localStorage.setItem(CATEGORY_OVERRIDES_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  // Unfiltered — used for overview, priceHistory, catTotals dropdown options
  const allItems = orders.flatMap(o =>
    (o.items || []).filter(i => i.price > 0).map(i => {
      const k = i.productId || i.name
      return { ...i, orderDate: o.date, orderId: o.orderId, cat: catOverrides[k] || categorize(i.name) }
    })
  )

  const insights = useMemo(() => computeInsights(orders, allItems), [orders])

  // Time-filtered views for orders + items tabs
  const bounds = getDateBounds(timeRange, customFrom, customTo, timeRangeMonth)
  const timeFilteredOrders = orders.filter(o => inRange(o.date, bounds))
  const timeFilteredItems = allItems.filter(i => inRange(i.orderDate, bounds))

  // Month options derived from all orders (not filtered)
  const orderMonths = [...new Set(orders.map(o => {
    const d = parseDate(o.date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }))].sort()

  const catTotals = {}
  allItems.forEach(i => { catTotals[i.cat] = (catTotals[i.cat] || 0) + i.price })

  const overviewCatTotals = {}
  timeFilteredItems.forEach(i => { overviewCatTotals[i.cat] = (overviewCatTotals[i.cat] || 0) + i.price })
  const overviewCatSorted = Object.entries(overviewCatTotals).sort((a, b) => b[1] - a[1])

  const overviewTotalSpent = timeFilteredOrders.reduce((s, o) => s + (o.totalAmount || 0), 0)
  const overviewAvgOrder = timeFilteredOrders.length ? overviewTotalSpent / timeFilteredOrders.length : 0

  const priceHistory = {}
  allItems.forEach(i => {
    const k = i.productId || i.name
    if (!priceHistory[k]) priceHistory[k] = { name: i.name, entries: [] }
    priceHistory[k].entries.push({ date: i.orderDate, unitPrice: i.unitPrice, price: i.price })
  })
  Object.values(priceHistory).forEach(p =>
    p.entries.sort((a, b) => parseDate(a.date) - parseDate(b.date))
  )

  const freqMap = {}
  allItems.forEach(i => { const k = i.productId || i.name; freqMap[k] = (freqMap[k] || 0) + 1 })
  const topRepeat = Object.entries(freqMap)
    .map(([k, count]) => ({ ...priceHistory[k], k, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)

  const overviewOrders = [...timeFilteredOrders].sort((a, b) => parseDate(a.date) - parseDate(b.date))
  const cats = ['All', ...Object.keys(catTotals).sort()]
  const drilldownOrderData = drilldownOrder ? timeFilteredOrders.find(o => o.orderId === drilldownOrder) : null
  const drilldownCatItems = drilldownCat
    ? Object.values(
        timeFilteredItems
          .filter(i => i.cat === drilldownCat)
          .reduce((acc, i) => {
            const k = i.productId || i.name
            if (!acc[k]) acc[k] = { name: i.name, count: 0, lastPrice: 0, lastDate: '', totalSpend: 0 }
            acc[k].count++
            acc[k].totalSpend += parseUnitPrice(i.unitPrice) * (parseInt(i.quantity) || 1)
            if (!acc[k].lastDate || parseDate(i.orderDate) > parseDate(acc[k].lastDate)) {
              acc[k].lastDate = i.orderDate
              acc[k].lastPrice = parseUnitPrice(i.unitPrice)
            }
            return acc
          }, {})
      ).sort((a, b) => b.totalSpend - a.totalSpend)
    : []
  const filtered = timeFilteredItems.filter(i =>
    (filterCat === 'All' || i.cat === filterCat) &&
    (!itemSearch || i.name.toLowerCase().includes(itemSearch.toLowerCase()))
  )

  const allCats = Object.keys(CAT_COLORS)

  function cycleSort(col) {
    if (sortCol !== col) { setSortCol(col); setSortDir('asc') }
    else if (sortDir === 'asc') setSortDir('desc')
    else { setSortCol(null); setSortDir('asc') }
  }

  const sortedFiltered = sortCol ? [...filtered].sort((a, b) => {
    let av, bv
    if (sortCol === 'name') { av = (a.name || '').toLowerCase(); bv = (b.name || '').toLowerCase() }
    else if (sortCol === 'cat') { av = (a.cat || '').toLowerCase(); bv = (b.cat || '').toLowerCase() }
    else if (sortCol === 'unitPrice') { av = parseUnitPrice(a.unitPrice); bv = parseUnitPrice(b.unitPrice) }
    else if (sortCol === 'total') { av = a.price ?? 0; bv = b.price ?? 0 }
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  }) : filtered

  const priceChangesCount = (item) =>
    item.entries.filter((e, i) => i > 0 &&
      parseUnitPrice(e.unitPrice) !== parseUnitPrice(item.entries[i - 1].unitPrice)
    ).length

  const filteredPriceHistory = Object.values(priceHistory)
    .filter(p => p.entries.length > 1)
    .filter(p => !priceSearch || p.name.toLowerCase().includes(priceSearch.toLowerCase()))
    .sort((a, b) => priceChangesCount(b) - priceChangesCount(a))

  useEffect(() => {
    if (tab !== 'overview') return
    const timer = setTimeout(() => {
      const freshOrders = overviewOrders
      if (spendChartRef.current) {
        spendChartInst.current?.destroy()
        spendChartInst.current = new Chart(spendChartRef.current, {
          type: 'bar',
          data: {
            labels: freshOrders.map(o => o.date.split(',')[0]),
            datasets: [{
              label: 'Order total',
              data: freshOrders.map(o => o.totalAmount),
              backgroundColor: '#E1251B',
              borderRadius: 5,
              borderSkipped: false,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: {
                ticks: { callback: v => '$' + v, font: { family: 'DM Sans' } },
                grid: { color: 'rgba(128,128,128,0.08)' },
                border: { dash: [4, 4] }
              },
              x: {
                ticks: { maxRotation: 35, font: { size: 11, family: 'DM Sans' }, autoSkip: false },
                grid: { display: false }
              }
            },
            onClick: (evt, elements) => {
              if (elements.length > 0) {
                const ord = freshOrders[elements[0].index]
                if (ord) setDrilldownOrder(prev => prev === ord.orderId ? null : ord.orderId)
              }
            },
            onHover: (evt, elements) => {
              if (evt.native?.target) evt.native.target.style.cursor = elements.length ? 'pointer' : 'default'
            },
          }
        })
      }
      if (catChartRef.current && overviewCatSorted.length) {
        catChartInst.current?.destroy()
        const top7 = overviewCatSorted.slice(0, 7)
        catChartInst.current = new Chart(catChartRef.current, {
          type: 'doughnut',
          data: {
            labels: top7.map(([c]) => c),
            datasets: [{
              data: top7.map(([, v]) => Math.round(v)),
              backgroundColor: top7.map(([c]) => CAT_COLORS[c] || '#888'),
              borderWidth: 2,
              borderColor: 'var(--bg-card)',
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: { legend: { display: false } },
            onClick: (evt, elements) => {
              if (elements.length > 0) {
                const cat = top7[elements[0].index]?.[0]
                if (cat) setDrilldownCat(prev => prev === cat ? null : cat)
              }
            },
            onHover: (evt, elements) => {
              if (evt.native?.target) evt.native.target.style.cursor = elements.length ? 'pointer' : 'default'
            },
          }
        })
      }
    }, 150)
    return () => { clearTimeout(timer); spendChartInst.current?.destroy(); catChartInst.current?.destroy() }
  }, [tab, orders, catOverrides, timeRange, timeRangeMonth, customFrom, customTo])

  async function handleScreenshot(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportStatus({ type: 'loading', msg: 'Claude is reading your screenshot…' })
    const b64 = await new Promise(res => {
      const r = new FileReader()
      r.onload = () => res(r.result.split(',')[1])
      r.readAsDataURL(file)
    })
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: file.type || 'image/jpeg', data: b64 } },
              { type: 'text', text: 'Extract all grocery items from this HEB order screenshot. Return ONLY valid JSON, no markdown fences, no explanation. Format: {"date":"Month DD, YYYY","items":[{"name":"product name","price":0.00,"quantity":"1 each","unitPrice":"$0.00 / ea"}]}. If date not visible use today. Include all visible items with prices. Omit items with $0 price.' }
            ]
          }]
        })
      })
      const data = await resp.json()
      const text = data.content?.map(c => c.text || '').join('') || ''
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      if (parsed.items?.length) {
        const newOrder = {
          orderId: 'SS_' + Date.now(),
          date: parsed.date || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          header: 'HEB (screenshot import)',
          totalAmount: parsed.items.reduce((s, i) => s + (i.price || 0), 0),
          itemCount: parsed.items.length,
          status: 'Imported',
          items: parsed.items
        }
        setOrders(prev => [newOrder, ...prev])
        setImportStatus({ type: 'success', msg: `✓ Imported ${parsed.items.length} items` })
        setTab('orders')
      } else {
        setImportStatus({ type: 'error', msg: 'No items found in screenshot' })
      }
    } catch (err) {
      setImportStatus({ type: 'error', msg: err.message.slice(0, 60) })
    }
    e.target.value = ''
    setTimeout(() => setImportStatus(null), 4000)
  }

  function saveManualOrder() {
    const items = manItems.filter(i => i.name && i.price)
    if (!items.length || !manDate) return
    const parsed = items.map(i => ({
      name: i.name,
      price: parseFloat(i.price) || 0,
      quantity: i.quantity || '1 each',
      unitPrice: '$' + (parseFloat(i.price) || 0).toFixed(2) + ' / ea'
    }))
    setOrders(prev => [{
      orderId: 'M_' + Date.now(),
      date: manDate,
      header: 'Manual entry',
      totalAmount: parsed.reduce((s, i) => s + i.price, 0),
      itemCount: parsed.length,
      status: 'Manual',
      items: parsed
    }, ...prev])
    setManDate('')
    setManItems([{ name: '', price: '', quantity: '1 each' }])
    setShowManual(false)
    setTab('orders')
  }

  function updateManItem(idx, field, val) {
    setManItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item))
  }

  const shortName = name => name?.replace(/, \d+(\.\d+)?\s*(oz|lb|lbs|ct|L|ml|g|pk).*/i, '').replace(/^H-E-B /i, '').replace(/^Hill Country Fare /i, '')

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>stocked & loaded</h1>
          <p className={styles.subtitle}>{orders.length} orders · Dec 2025 – present</p>
        </div>
        <div className={styles.headerActions}>
          {importStatus && (
            <span className={`${styles.importBadge} ${styles[importStatus.type]}`}>
              {importStatus.msg}
            </span>
          )}
          {API_KEY && (
            <label className={styles.importBtn}>
              <i className="ti ti-camera" aria-hidden="true" />
              Import screenshot
              <input type="file" accept="image/*" onChange={handleScreenshot} style={{ display: 'none' }} />
            </label>
          )}
          <button
            className={showManual ? styles.activeBtn : ''}
            onClick={() => setShowManual(s => !s)}
          >
            <i className="ti ti-plus" aria-hidden="true" />
            Add manually
          </button>
        </div>
      </header>

      {showManual && (
        <div className={styles.manualPanel}>
          <p className={styles.panelTitle}>Add order manually</p>
          <div className={styles.manualRow}>
            <div className={styles.field}>
              <label>Order date</label>
              <input
                type="text"
                placeholder="May 21, 2026"
                value={manDate}
                onChange={e => setManDate(e.target.value)}
                style={{ maxWidth: 200 }}
              />
            </div>
          </div>
          {manItems.map((item, idx) => (
            <div key={idx} className={styles.manualItemRow}>
              <input placeholder="Item name" value={item.name} onChange={e => updateManItem(idx, 'name', e.target.value)} style={{ flex: 2 }} />
              <input placeholder="Price" type="number" step="0.01" value={item.price} onChange={e => updateManItem(idx, 'price', e.target.value)} style={{ width: 90 }} />
              <input placeholder="Qty" value={item.quantity} onChange={e => updateManItem(idx, 'quantity', e.target.value)} style={{ width: 90 }} />
              {idx > 0 && (
                <button onClick={() => setManItems(prev => prev.filter((_, i) => i !== idx))} style={{ width: 36, padding: 0, justifyContent: 'center' }}>
                  <i className="ti ti-x" aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
          <div className={styles.manualActions}>
            <button onClick={() => setManItems(prev => [...prev, { name: '', price: '', quantity: '1 each' }])}>
              <i className="ti ti-plus" aria-hidden="true" /> Add item
            </button>
            <button className="primary" onClick={saveManualOrder}>Save order</button>
          </div>
        </div>
      )}

      <nav className={styles.tabs}>
        {['overview', 'orders', 'items', 'price history', 'insights'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={tab === t ? styles.activeTab : styles.tab}
          >
            {t === 'overview' && <i className="ti ti-layout-dashboard" aria-hidden="true" />}
            {t === 'orders' && <i className="ti ti-shopping-cart" aria-hidden="true" />}
            {t === 'items' && <i className="ti ti-list" aria-hidden="true" />}
            {t === 'price history' && <i className="ti ti-chart-line" aria-hidden="true" />}
            {t === 'insights' && <i className="ti ti-bulb" aria-hidden="true" />}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>

      <main className={styles.main}>
        {tab === 'overview' && (
          <>
            <TimeFilterBar
              timeRange={timeRange} setTimeRange={setTimeRange}
              timeRangeMonth={timeRangeMonth} setTimeRangeMonth={setTimeRangeMonth}
              customFrom={customFrom} setCustomFrom={setCustomFrom}
              customTo={customTo} setCustomTo={setCustomTo}
              orderMonths={orderMonths} tab={tab}
              timeFilteredOrders={timeFilteredOrders} timeFilteredItems={timeFilteredItems}
              orders={orders} allItems={allItems}
            />
            <div className={styles.metrics}>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Total spent</span>
                <span className={styles.metricValue}>${overviewTotalSpent.toFixed(2)}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Orders</span>
                <span className={styles.metricValue}>{timeFilteredOrders.length}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Avg per order</span>
                <span className={styles.metricValue}>${overviewAvgOrder.toFixed(2)}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Items tracked</span>
                <span className={styles.metricValue}>{timeFilteredItems.length}</span>
              </div>
            </div>

            <div className={styles.charts}>
              <div className={styles.card}>
                <p className={styles.cardLabel}>Spend per order</p>
                <div style={{ position: 'relative', height: 220 }}>
                  <canvas ref={spendChartRef} role="img" aria-label="Bar chart of spend per order" />
                </div>
              </div>
              <div className={styles.card}>
                <p className={styles.cardLabel}>By category</p>
                <div style={{ position: 'relative', height: 170 }}>
                  <canvas ref={catChartRef} role="img" aria-label="Donut chart of spending by category" />
                </div>
                <div className={styles.legend}>
                  {overviewCatSorted.slice(0, 7).map(([cat, val]) => (
                    <span key={cat} className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: CAT_COLORS[cat] || '#888' }} />
                      {cat} <span className={styles.legendVal}>${val.toFixed(0)}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {drilldownOrderData && (
              <div className={styles.drilldownPanel}>
                <div className={styles.drilldownHeader}>
                  <div>
                    <p className={styles.orderDate}>{drilldownOrderData.date}</p>
                    <p className={styles.orderLocation}>{drilldownOrderData.header}</p>
                  </div>
                  <div className={styles.orderMeta}>
                    <p className={styles.orderTotal}>${(drilldownOrderData.totalAmount || 0).toFixed(2)}</p>
                    <p className={styles.orderSub}>{drilldownOrderData.itemCount} items · <span className={styles.orderStatus}>{drilldownOrderData.status}</span></p>
                  </div>
                  <button className={styles.drilldownClose} onClick={() => setDrilldownOrder(null)}>
                    <i className="ti ti-x" aria-hidden="true" />
                  </button>
                </div>
                <div className={styles.orderItems}>
                  {(drilldownOrderData.items || []).filter(i => i.price > 0).map((item, idx) => {
                    const cat = catOverrides[item.productId || item.name] || categorize(item.name)
                    return (
                      <div key={idx} className={styles.orderItem}>
                        <span className={styles.catDot} style={{ background: CAT_COLORS[cat], boxShadow: `0 0 0 3px ${CAT_BG[cat] || '#f3f4f6'}` }} />
                        <span className={styles.orderItemName}>{item.name}</span>
                        <span className={styles.orderItemMeta}>
                          {item.quantity && <span>{item.quantity} · </span>}
                          ${(item.price || 0).toFixed(2)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {drilldownCat && (
              <div className={styles.drilldownPanel}>
                <div className={styles.drilldownHeader}>
                  <div>
                    <p className={styles.orderDate}>{drilldownCat}</p>
                    <p className={styles.orderLocation}>${(overviewCatTotals[drilldownCat] || 0).toFixed(2)} total spend</p>
                  </div>
                  <button className={styles.drilldownClose} onClick={() => setDrilldownCat(null)}>
                    <i className="ti ti-x" aria-hidden="true" />
                  </button>
                </div>
                <div className={styles.orderItems}>
                  {drilldownCatItems.map((item, idx) => (
                    <div key={idx} className={styles.orderItem}>
                      <span className={styles.catDot} style={{ background: CAT_COLORS[drilldownCat] || '#888' }} />
                      <span className={styles.orderItemName}>{item.name}</span>
                      <span className={styles.orderItemMeta}>×{item.count} · ${item.lastPrice.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.insightsCard}>
              <p className={styles.cardLabel}>
                This month at a glance
                <span className={styles.insightsCalNote}> · current month</span>
              </p>
              <div className={styles.insightsStats}>
                <div className={styles.insightsStat}>
                  <span className={styles.insightsStatLabel}>This month</span>
                  <span className={styles.insightsStatValue}>${insights.currentMonth.toFixed(2)}</span>
                </div>
                <div className={styles.insightsStat}>
                  <span className={styles.insightsStatLabel}>vs last month</span>
                  <span className={`${styles.insightsStatValue} ${insights.momDelta != null ? (insights.momDelta > 0 ? styles.insightsDeltaUp : insights.momDelta < 0 ? styles.insightsDeltaDown : styles.insightsDeltaFlat) : ''}`}>
                    {insights.momDelta != null
                      ? insights.momDelta === 0
                        ? 'No change'
                        : `${insights.momDelta > 0 ? '+' : '-'}$${Math.abs(insights.momDelta).toFixed(2)}`
                      : '—'}
                  </span>
                </div>
                <div className={styles.insightsStat}>
                  <span className={styles.insightsStatLabel}>Price changes</span>
                  <span className={styles.insightsStatValue}>{insights.priceChanges}</span>
                </div>
              </div>
              <div className={styles.insightsFooter}>
                <span className={styles.insightsFooterNote}>
                  {insights.biggestJump && `↑ ${shortName(insights.biggestJump.name)} +$${insights.biggestJump.diff.toFixed(2)} (${insights.biggestJump.pct}%)`}
                  {insights.biggestJump && insights.biggestDrop && ' · '}
                  {insights.biggestDrop && `↓ ${shortName(insights.biggestDrop.name)} -$${Math.abs(insights.biggestDrop.diff).toFixed(2)} (${insights.biggestDrop.pct}%)`}
                </span>
                <button className={styles.insightsLink} onClick={() => setTab('insights')}>
                  View insights →
                </button>
              </div>
            </div>

            <div className={styles.card}>
              <p className={styles.cardLabel}>Top repeat buys</p>
              <div className={styles.repeatGrid}>
                {topRepeat.map(item => (
                  <div key={item.k} className={styles.repeatItem}>
                    <span className={styles.repeatName} title={item.name}>{shortName(item.name)}</span>
                    <span className={styles.repeatCount}>×{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'orders' && (
          <>
            <TimeFilterBar
              timeRange={timeRange} setTimeRange={setTimeRange}
              timeRangeMonth={timeRangeMonth} setTimeRangeMonth={setTimeRangeMonth}
              customFrom={customFrom} setCustomFrom={setCustomFrom}
              customTo={customTo} setCustomTo={setCustomTo}
              orderMonths={orderMonths} tab={tab}
              timeFilteredOrders={timeFilteredOrders} timeFilteredItems={timeFilteredItems}
              orders={orders} allItems={allItems}
            />
            <div className={styles.orderList}>
              {timeFilteredOrders.map(o => {
                const open = expandedOrder === o.orderId
                return (
                  <div
                    key={o.orderId}
                    className={`${styles.orderCard} ${open ? styles.orderCardOpen : ''}`}
                    onClick={() => setExpandedOrder(open ? null : o.orderId)}
                  >
                    <div className={styles.orderCardHeader}>
                      <div>
                        <p className={styles.orderDate}>{o.date}</p>
                        <p className={styles.orderLocation}>{o.header}</p>
                      </div>
                      <div className={styles.orderMeta}>
                        <p className={styles.orderTotal}>${(o.totalAmount || 0).toFixed(2)}</p>
                        <p className={styles.orderSub}>{o.itemCount} items · <span className={styles.orderStatus}>{o.status}</span></p>
                      </div>
                    </div>
                    {open && (
                      <div className={styles.orderItems} onClick={e => e.stopPropagation()}>
                        {(o.items || []).filter(i => i.price > 0).map((item, idx) => {
                          const cat = catOverrides[item.productId || item.name] || categorize(item.name)
                          return (
                            <div key={idx} className={styles.orderItem}>
                              <span
                                className={styles.catDot}
                                style={{ background: CAT_COLORS[cat], boxShadow: `0 0 0 3px ${CAT_BG[cat] || '#f3f4f6'}` }}
                              />
                              <span className={styles.orderItemName}>{item.name}</span>
                              <span className={styles.orderItemMeta}>
                                {item.quantity && <span>{item.quantity} · </span>}
                                ${(item.price || 0).toFixed(2)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {tab === 'items' && (
          <>
            <TimeFilterBar
              timeRange={timeRange} setTimeRange={setTimeRange}
              timeRangeMonth={timeRangeMonth} setTimeRangeMonth={setTimeRangeMonth}
              customFrom={customFrom} setCustomFrom={setCustomFrom}
              customTo={customTo} setCustomTo={setCustomTo}
              orderMonths={orderMonths} tab={tab}
              timeFilteredOrders={timeFilteredOrders} timeFilteredItems={timeFilteredItems}
              orders={orders} allItems={allItems}
            />
            <div className={styles.filterRow}>
              <div style={{ position: 'relative', flex: 1 }}>
                <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 16 }} aria-hidden="true" />
                <input
                  placeholder="Search items…"
                  value={itemSearch}
                  onChange={e => setItemSearch(e.target.value)}
                  style={{ paddingLeft: 34 }}
                />
              </div>
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ minWidth: 160 }}>
                {cats.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
              <div className={styles.tableHead}>
                {[['name','Item'],['cat','Category'],['unitPrice','Unit price'],['total','Total']].map(([col, label]) => (
                  <span key={col} className={styles.sortable} onClick={() => cycleSort(col)}>
                    {label}
                    {sortCol === col
                      ? <i key="active" className={`ti ti-chevron-${sortDir === 'asc' ? 'up' : 'down'}`} />
                      : <i key="inactive" className={`ti ti-chevron-up ${styles.sortInactive}`} />}
                  </span>
                ))}
              </div>
              {sortedFiltered.slice(0, 100).map((item, idx) => (
                <div key={idx} className={styles.tableRow}>
                  <span className={styles.itemName} title={item.name}>{item.name}</span>
                  <select
                    className={styles.catSelect}
                    value={item.cat}
                    style={{ background: CAT_BG[item.cat] || '#f3f4f6', color: CAT_COLORS[item.cat] || '#6b7280' }}
                    onChange={e => setCatOverride(item.productId || item.name, e.target.value)}
                    onClick={e => e.stopPropagation()}
                  >
                    {allCats.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <span className={styles.unitPrice}>{item.unitPrice}</span>
                  <span className={styles.itemTotal}>${(item.price || 0).toFixed(2)}</span>
                </div>
              ))}
              {sortedFiltered.length > 100 && (
                <p className={styles.moreHint}>Showing 100 of {sortedFiltered.length} — use search to narrow down</p>
              )}
            </div>
          </>
        )}

        {tab === 'price history' && (
          <>
            <div className={styles.filterRow}>
              <div style={{ position: 'relative', flex: 1 }}>
                <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 16 }} aria-hidden="true" />
                <input
                  placeholder="Search items…"
                  value={priceSearch}
                  onChange={e => setPriceSearch(e.target.value)}
                  style={{ paddingLeft: 34 }}
                />
              </div>
            </div>
            <p className={styles.sectionHint}>Items bought more than once, sorted by number of price changes.</p>
            <div className={styles.priceList}>
              {filteredPriceHistory.map(item => (
                <PriceHistoryCard key={item.name} item={item} />
              ))}
            </div>
          </>
        )}

        {tab === 'insights' && (() => {
          const now = new Date()
          const curLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          const prevLabel = prevDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          return (
            <>
              <div className={styles.card}>
                <p className={styles.cardLabel}>Month over month</p>
                <div className={styles.insightsMonthRow}>
                  <div className={styles.insightsMonthBox}>
                    <span className={styles.insightsStatLabel}>{curLabel}</span>
                    <span className={styles.insightsStatValue}>${insights.currentMonth.toFixed(2)}</span>
                  </div>
                  <div className={styles.insightsMonthBox}>
                    <span className={styles.insightsStatLabel}>{prevLabel}</span>
                    <span className={styles.insightsStatValue}>${insights.prevMonth.toFixed(2)}</span>
                  </div>
                  {insights.momDelta != null && (
                    <div className={styles.insightsMonthBox}>
                      <span className={styles.insightsStatLabel}>Change</span>
                      <span className={`${styles.insightsStatValue} ${insights.momDelta > 0 ? styles.insightsDeltaUp : insights.momDelta < 0 ? styles.insightsDeltaDown : styles.insightsDeltaFlat}`}>
                        {insights.momDelta === 0
                          ? 'No change'
                          : `${insights.momDelta > 0 ? '+' : '-'}$${Math.abs(insights.momDelta).toFixed(2)}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.card}>
                <p className={styles.cardLabel}>Price movers</p>
                <div className={styles.insightsPriceCols}>
                  <div>
                    <p className={styles.insightsPriceColLabel}>↑ Increases ({insights.priceJumps.length})</p>
                    {insights.priceJumps.slice(0, 6).map(c => (
                      <div key={c.name} className={styles.insightsPriceRow}>
                        <span className={styles.insightsPriceName}>{shortName(c.name)}</span>
                        <span className={styles.insightsPriceDeltaUp}>+${c.diff.toFixed(2)} ({c.pct}%)</span>
                      </div>
                    ))}
                    {insights.priceJumps.length === 0 && <p className={styles.insightsEmpty}>None</p>}
                  </div>
                  <div>
                    <p className={styles.insightsPriceColLabel}>↓ Decreases ({insights.priceDrops.length})</p>
                    {insights.priceDrops.slice(0, 6).map(c => (
                      <div key={c.name} className={styles.insightsPriceRow}>
                        <span className={styles.insightsPriceName}>{shortName(c.name)}</span>
                        <span className={styles.insightsPriceDeltaDown}>-${Math.abs(c.diff).toFixed(2)} ({c.pct}%)</span>
                      </div>
                    ))}
                    {insights.priceDrops.length === 0 && <p className={styles.insightsEmpty}>None</p>}
                  </div>
                </div>
              </div>

              <div className={styles.card}>
                <p className={styles.cardLabel}>Category trends (MoM)</p>
                {insights.categoryTrend && (
                  <p className={styles.insightsCatTrend}>
                    Biggest shift: <strong>{insights.categoryTrend.cat}</strong>
                    {insights.categoryTrend.growth > 0 ? ' +' : ' -'}${Math.abs(insights.categoryTrend.growth).toFixed(2)} vs last month
                  </p>
                )}
                <div className={styles.insightsCatList}>
                  {insights.catDeltas.filter(c => c.prev > 0).slice(0, 8).map(c => {
                    const pct = Math.min(100, Math.abs(c.growth / Math.max(c.prev, 0.01)) * 100)
                    return (
                      <div key={c.cat} className={styles.insightsCatRow}>
                        <span className={styles.legendDot} style={{ background: CAT_COLORS[c.cat] || '#888' }} />
                        <span className={styles.insightsCatName}>{c.cat}</span>
                        <span className={styles.insightsCatBar}>
                          <span className={styles.insightsCatBarFill} style={{ width: `${pct}%`, background: c.growth > 0 ? '#FCCACA' : '#B7E4CC' }} />
                        </span>
                        <span className={c.growth > 0 ? styles.insightsDeltaUp : styles.insightsDeltaDown} style={{ fontSize: 12, fontFamily: 'var(--mono)', flexShrink: 0 }}>
                          {c.growth > 0 ? '+' : ''}${c.growth.toFixed(2)}
                        </span>
                      </div>
                    )
                  })}
                  {insights.catDeltas.filter(c => c.prev > 0).length === 0 && (
                    <p className={styles.insightsEmpty}>No prior month data to compare</p>
                  )}
                </div>
              </div>
            </>
          )
        })()}
      </main>
    </div>
  )
}
