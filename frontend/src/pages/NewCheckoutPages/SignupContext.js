import { createContext, useContext, useState } from 'react';

const Ctx = createContext(null);
export const useSignup = () => useContext(Ctx);

export default function SignupProvider({ children }) {
  const [state, setState] = useState({
    email: '',

    // new required signup fields
    dob: '',
    gender: '',
    username: '',
    isCaregiver: false,
    cgFirst: '',
    cgLast: '',
    cgPhone: '',
    cgEmail: '',
    pickedCore: false,
    pickedApoe: false,
    // pickedDoctorsData: false
  });

  const setField = (key, value) =>
    setState((prev) => ({ ...prev, [key]: value }));

  return <Ctx.Provider value={{ state, setField }}>{children}</Ctx.Provider>;
}
