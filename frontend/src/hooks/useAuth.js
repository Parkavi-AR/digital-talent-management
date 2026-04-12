import { useContext } from 'react';
import { AuthContext } from '../context/AuthContextObject';

export const useAuth = () => useContext(AuthContext);
