import { createMemoryImageStore } from "./memoryImageStore";
import { describeImageStoreContract } from "../../test/imageStoreContract";

describeImageStoreContract("in-memory image store", () =>
  createMemoryImageStore(),
);
