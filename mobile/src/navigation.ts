// Shared route param types for the native stack navigator.
export type RootStackParamList = {
  Home: undefined;
  Upload: undefined;
  Analysis: { videoId: string; title?: string };
};
