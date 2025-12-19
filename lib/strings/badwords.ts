import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from "obscenity";

export let matcher = null;

export const init = () => {
  matcher = new RegExpMatcher({
    ...englishDataset.build(),
    ...englishRecommendedTransformers,
  });

  return matcher;
};

export const hasBadWords = (string: string) => {
  if (matcher === null) {
    return false;
  }
  return matcher.hasMatch(string);
};

export default {
  init,
};
