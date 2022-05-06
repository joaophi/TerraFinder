import { useEffect, useState } from "react";
import apiClient from "../apiClient";
import { useAPIURL } from "../contexts/ChainsContext";

let CACHE: { [key: string]: string | undefined };

const useLabel = (
  address: string
): { data: string | undefined; isLoading: boolean } => {
  const [data, setData] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  const apiUrl = useAPIURL();
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (!CACHE) {
          const { data } = await apiClient.get(apiUrl + "/v1/label");
          CACHE = data;
        }

        setData(CACHE?.[address]);
      } catch {
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [address, apiUrl]);

  return { data, isLoading };
};

export default useLabel;
