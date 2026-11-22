"use client";
import { createContext } from "react";
import type { ReaderStoreApi } from "./reader-store";

export const ReaderContext = createContext<ReaderStoreApi | null>(null);
