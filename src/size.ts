export const createBrotliSizeGetter = () => {
  return (code: string) => {
    // eslint-disable-next-line no-console
    const data = Buffer.from(code || '', 'utf-8');
    return data.length;
  };
};

export const sizeGetter = (code: string) => {
  const data = Buffer.from(code, 'utf-8');
  return data.length;
};
