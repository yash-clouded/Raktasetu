import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { SERVER_URL } from './config';
import Sidebar from './components/Sidebar';
import OSDashboard from './components/OSDashboard';
import MHCDashboard from './components/MHCDashboard';
import TranscriptsScreen from './components/TranscriptsScreen';
import { OsLogin, MhcLogin } from './components/LoginScreens';
import SysStatusBar from './components/SysStatusBar';
import { fakeSessionIp } from './lib/geo';

export default function App() {
  // view defaults from the URL hash (e.g. #transcripts) so any console can be
  // opened directly — handy for demos and for the headless smoke checks.
  const [view, setView] = useState(() => {
    const h = window.location.hash.replace('#', '');
    return h === 'mhc' || h === 'transcripts' ? h : 'os';
  });
  const nav = (id) => {
    setView(id);
    if (id === 'os') window.history.replaceState(null, '', window.location.pathname);
    else window.history.replaceState(null, '', `#${id}`);
  };

  // fake auth sessions — one per console, client-only. Reset on logout.
  const [auth, setAuth] = useState({ os: false, osOperator: '', mhc: false, mhcUnit: '' });

  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connState, setConnState] = useState('disconnected'); // REAL socket state
  const [lastSyncAt, setLastSyncAt] = useState(null);
  // fake per-session node identity — constant for the life of the tab
  const sessionIp = useMemo(() => fakeSessionIp(), []);
  const socketRef = useRef(null);

  useEffect(() => {
    // REAL INTEGRATION POINT — the socket is local-only for this demo; a real
    // deployment would point SERVER_URL at the production broker instead.
    const socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setConnState('connected');
    });
    socket.on('disconnect', () => {
      setConnected(false);
      setConnState('disconnected');
    });
    socket.on('connect_error', () => setConnState('reconnecting'));
    socket.on('reconnect', () => setConnState('connected'));

    socket.on('state', (next) => {
      setState(next);
      // real wall-clock time of the last genuine state broadcast
      setLastSyncAt(Date.now());
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const emit = (event, payload) => socketRef.current?.emit(event, payload);

  const logout = () => setAuth({ osOp: '', mhc: false, mhcUnit: '' });

  const nodeLabel =
    view === 'mhc'
      ? `Node: ${auth.mhc ? auth.mhcUnit : 'MHC'}-FIELD`
      : view === 'os'
        ? 'Node: OS-CMD-01'
        : 'Node: TR-DESK-01';

  return (
    <div className="app-shell">
      <Sidebar view={view} onNavigate={nav} signedIn={auth.osOp || auth.mhc} onLogout={logout} />

      <main className="app-main">
        {view === 'os' &&
          (auth.osOp ? (
            <OSDashboard
              state={state}
              connected={connected}
              onDispatch={(requestId) => emit('dispatch', { requestId })}
            />
          ) : (
            <OsLogin onAuth={({ operatorId }) => setAuth((a) => ({ ...a, osOp: operatorId }))} />
          ))}

        {view === 'mhc' &&
          (auth.mhc ? (
            <MHCDashboard
              state={state}
              connected={connected}
              onStartDelivery={() => emit('start-delivery')}
            />
          ) : (
            <MhcLogin units={state?.fleet || []} onAuth={({ mhcUnit }) => setAuth((a) => ({ ...a, mhc: true, mhcUnit }))} />
          ))}

        {view === 'transcripts' && <TranscriptsScreen state={state} connected={connected} />}
      </main>

      <SysStatusBar
        connState={connState}
        sessionIp={sessionIp}
        lastSyncAt={lastSyncAt}
        nodeLabel={nodeLabel}
      />
    </div>
  );
}