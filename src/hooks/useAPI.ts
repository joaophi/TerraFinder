import { useEffect, useState } from "react";
import apiClient from "../apiClient";
import { useAPIURL } from "../contexts/ChainsContext";

const useAPI = <T>(
  url: string,
  offset?: number,
  limit?: number,
  address?: string
): { data: T | undefined; isLoading: boolean } => {
  const [data, setData] = useState<T>();
  const [isLoading, setIsLoading] = useState(true);

  const init = (): void => {
    setIsLoading(true);
  };
  const apiUrl = useAPIURL();
  useEffect(() => {
    const fetchData = async () => {
      init();
      const params = { offset, limit: limit, account: address };

      try {
        const result = await apiClient.get(apiUrl + url, { params: params });

        if (result.data === null) {
          throw new Error("Data is null");
        }

        setData(result.data);
      } catch {}
      setIsLoading(false);
    };
    fetchData();
  }, [url, apiUrl, address, offset, limit]);

  return { data, isLoading };
};

export default useAPI;
