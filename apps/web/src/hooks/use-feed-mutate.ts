"use client";
import { useSWRConfig } from "swr";

export function useFeedMutate() {
  return useSWRConfig().mutate;
}
