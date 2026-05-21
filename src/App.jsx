import { useState, useEffect, useRef } from 'react'
import { categorize, CAT_COLORS, CAT_BG } from './categories'
import SEED_DATA from './seedData'
import { Chart, registerables } from 'chart.js'
import styles from './App.module.css'

Chart.register(...registerables)

const STORAGE_KEY = 'stocked_and_loaded_v1'

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

function parseDate(str) {
  return new Date(str.replace(/–.*/, '').trim())
}

function parseUnitPrice(str) {
  if (!str) return 0
  const m = str.match(/\$?([\d.]+)/)
  return m ? parseFloat(m[1]) : 0
}

function SparkLine({ entries }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || entries.length < 2) return
    chartRef.current?.destroy()
    const prices = entries.map(e => parseUnitPrice(e.unitPrice))
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: entries.map((_, i) => i),
        datasets: [{
          data: prices,
          borderColor: '#2B8562',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: false,
        }]
      },
      options: {
        responsive: false,
        animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
      }
    })
    return () => { chartRef.current?.destroy() }
  }, [entries])

  if (entries.length < 2) return null
  return <canvas ref={canvasRef} width={120} height={48} style={{ display: 'block' }} />
}

export default function App() {
  const [orders, setOrders] = useState(loadOrders)
  const [tab, setTab] = useState('overview')
  const [expandedOrder, setExpandedOrder] = useState(null)
  const [filterCat, setFilterCat] = useState('All')
  const [itemSearch, setItemSearch] = useState('')
  const [priceSearch, setPriceSearch] = useState('')
  const [importStatus, setImportStatus] = useState(null)
  const [showManual, setShowManual] = useState(false)
  const [manDate, setManDate] = useState('')
  const [manItems, setManItems] = useState([{ name: '', price: '', quantity: '1 each' }])
  const spendChartRef = useRef(null)
  const catChartRef = useRef(null)
  const spendChartInst = useRef(null)
  const catChartInst = useRef(null)

  useEffect(() => { saveOrders(orders) }, [orders])

  const allItems = orders.flatMap(o =>
    (o.items || []).filter(i => i.price > 0).map(i => ({
      ...i, orderDate: o.date, orderId: o.orderId, cat: categorize(i.name)
    }))
  )

  const totalSpent = orders.reduce((s, o) => s + (o.totalAmount || 0), 0)
  const avgOrder = totalSpent / orders.length

  const catTotals = {}
  allItems.forEach(i => { catTotals[i.cat] = (catTotals[i.cat] || 0) + i.price })
  const catSorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1])

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

  const ordersChron = [...orders].sort((a, b) => parseDate(a.date) - parseDate(b.date))
  const cats = ['All', ...Object.keys(catTotals).sort()]
  const filtered = allItems.filter(i =>
    (filterCat === 'All' || i.cat === filterCat) &&
    (!itemSearch || i.name.toLowerCase().includes(itemSearch.toLowerCase()))
  )

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
      if (spendChartRef.current) {
        spendChartInst.current?.destroy()
        spendChartInst.current = new Chart(spendChartRef.current, {
          type: 'bar',
          data: {
            labels: ordersChron.map(o => o.date.split(',')[0]),
            datasets: [{
              label: 'Order total',
              data: ordersChron.map(o => o.totalAmount),
              backgroundColor: '#2d6a4f',
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
            }
          }
        })
      }
      if (catChartRef.current && catSorted.length) {
        catChartInst.current?.destroy()
        const top7 = catSorted.slice(0, 7)
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
            plugins: { legend: { display: false } }
          }
        })
      }
    }, 150)
    return () => {
      clearTimeout(timer)
    }
  }, [tab, orders])

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
          <label className={styles.importBtn}>
            <i className="ti ti-camera" aria-hidden="true" />
            Import screenshot
            <input type="file" accept="image/*" onChange={handleScreenshot} style={{ display: 'none' }} />
          </label>
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
        {['overview', 'orders', 'items', 'price history'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={tab === t ? styles.activeTab : styles.tab}
          >
            {t === 'overview' && <i className="ti ti-layout-dashboard" aria-hidden="true" />}
            {t === 'orders' && <i className="ti ti-shopping-cart" aria-hidden="true" />}
            {t === 'items' && <i className="ti ti-list" aria-hidden="true" />}
            {t === 'price history' && <i className="ti ti-chart-line" aria-hidden="true" />}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>

      <main className={styles.main}>
        {tab === 'overview' && (
          <>
            <div className={styles.metrics}>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Total spent</span>
                <span className={styles.metricValue}>${totalSpent.toFixed(2)}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Orders</span>
                <span className={styles.metricValue}>{orders.length}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Avg per order</span>
                <span className={styles.metricValue}>${avgOrder.toFixed(2)}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Items tracked</span>
                <span className={styles.metricValue}>{allItems.length}</span>
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
                  {catSorted.slice(0, 7).map(([cat, val]) => (
                    <span key={cat} className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: CAT_COLORS[cat] || '#888' }} />
                      {cat} <span className={styles.legendVal}>${val.toFixed(0)}</span>
                    </span>
                  ))}
                </div>
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
          <div className={styles.orderList}>
            {orders.map(o => {
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
                        const cat = categorize(item.name)
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
        )}

        {tab === 'items' && (
          <>
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
                <span>Item</span>
                <span>Category</span>
                <span>Unit price</span>
                <span>Total</span>
              </div>
              {filtered.slice(0, 100).map((item, idx) => (
                <div key={idx} className={styles.tableRow}>
                  <span className={styles.itemName} title={item.name}>{item.name}</span>
                  <span className={styles.catBadge} style={{ background: CAT_BG[item.cat] || '#f3f4f6', color: CAT_COLORS[item.cat] || '#6b7280' }}>
                    {item.cat}
                  </span>
                  <span className={styles.unitPrice}>{item.unitPrice}</span>
                  <span className={styles.itemTotal}>${(item.price || 0).toFixed(2)}</span>
                </div>
              ))}
              {filtered.length > 100 && (
                <p className={styles.moreHint}>Showing 100 of {filtered.length} — use search to narrow down</p>
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
              {filteredPriceHistory.map((item, idx) => (
                <div key={idx} className={styles.card}>
                  <div className={styles.priceCardTop}>
                    <p className={styles.priceItemName}>{item.name}</p>
                    <SparkLine entries={item.entries} />
                  </div>
                  <div className={styles.priceEntries}>
                    {item.entries.map((e, i) => {
                      const prev = item.entries[i - 1]
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
                            <span className={isUp ? styles.priceDeltaUp : styles.priceDeltaDown}>
                              {deltaStr}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
