import { createContext, useContext, useState } from 'react';

const Ctx = createContext(null);
export const useSignup = () => useContext(Ctx);

export default function SignupProvider({ children }) {
  const [state, setState] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
  });
  const setField = (k, v) => setState((s) => ({ ...s, [k]: v }));
  return <Ctx.Provider value={{ state, setField }}>{children}</Ctx.Provider>;
}
