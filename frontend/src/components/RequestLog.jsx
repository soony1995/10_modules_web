import { useRequestLog } from '../contexts/RequestLogContext.jsx'

const RequestLog = () => {
  const { logs } = useRequestLog()

  return (
    <section className="logs">
      <h2>Request Log</h2>
      {logs.length === 0 && <p>No requests yet.</p>}
      {logs.map((log) => (
        <article key={log.id} className="log-item">
          <header>
            <strong>{log.title}</strong>
            <span>{log.timestamp}</span>
          </header>
          <pre>{JSON.stringify(log.payload, null, 2)}</pre>
        </article>
      ))}
    </section>
  )
}

export default RequestLog
