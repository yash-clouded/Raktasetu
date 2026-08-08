import { useState } from 'react';
import { Cross, LockIcon } from './icons';

// ===========================================================================
// DEMO-ONLY login screens — fake auth, client-side check against hardcoded
// strings. No real backend validation, no sessions, no tokens. Credentials
// are surfaced as hints so a live demo can get into a console with one click.
// Both screens share the dashboard design language (maroon accent, serif
// headline, thin borders) so they read as the same product family.
// ===========================================================================

export function OsLogin({ onAuth }) {
  const [operatorId, setOperatorId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    // hardcoded demo credential — client-side only, not a real auth backend
    if (operatorId.trim() === 'demo' && password === 'demo123') {
      onAuth({ operatorId: operatorId.trim() });
    } else {
      setError('Invalid operator credentials — use the demo values below.');
    }
  };

  const useDemo = () => {
    setOperatorId('demo');
    setPassword('demo123');
    setError('');
  };

  return (
    <div className="login-wrap">
      <form
        className="panel login-card"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="login-glyph"><Cross /></div>
        <h1 className="login-title">RaktaSetu — Operating System Access</h1>
        <p className="login-sub">command-centre coordinator sign-in · network operations desk</p>

        <label className="field">
          <span>Operator ID</span>
          <input value={operatorId} onChange={(e) => setOperatorId(e.target.value)} placeholder="demo" autoFocus />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="demo123" />
        </label>

        {error && <p className="login-error">{error}</p>}

        <button className="btn-primary login-submit" type="submit">
          <LockIcon /> Enter command centre
        </button>

        <button type="button" className="login-demo" onClick={useDemo}>
          Use demo credentials
        </button>

        <p className="login-caveat">Authorized personnel only · demo build — no real authentication</p>
      </form>
    </div>
  );
}

export function MhcLogin({ units = [], onAuth }) {
  const [mhcUnit, setMhcUnit] = useState(units[0]?.id || 'MHC-01');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    // hardcoded field-unit PIN for the demo (client-side only)
    if (pin === '2207') {
      onAuth({ mhcUnit });
    } else {
      setError('Incorrect unit PIN — use the sample PIN on the field console.');
    }
  };

  const useDemo = () => setPin('2207');

  return (
    <div className="login-wrap">
      <form
        className="panel login-card is-field"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="login-glyph">
          <LockIcon />
        </div>
        <h1 className="login-title">Mobile Health Centre Access</h1>
        <p className="login-sub">field/vehicle-unit sign-in · driver console on the MHC cabin tablet</p>

        <label className="field">
          <span>Unit</span>
          <select value={mhcUnit} onChange={(e) => setMhcUnit(e.target.value)} className="field-unit">
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.id} — {u.mhcOperator}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Unit PIN</span>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="· · · ·"
            className="field-pin"
          />
        </label>

        {error && <p className="login-error">{error}</p>}

        <button className="btn-primary login-submit is-touch" type="submit">
          Unlock crew console
        </button>

        <button type="button" className="login-demo" onClick={useDemo}>
          Use demo PIN
        </button>

        <p className="login-caveat">Larger touch targets optimised for a moving vehicle · demo data</p>
      </form>
    </div>
  );
}