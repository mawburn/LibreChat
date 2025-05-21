import { useParams } from 'react-router-dom';

export default function useTypedParams<T extends Record<string, string>>() {
  return useParams() as Partial<T>;
}
