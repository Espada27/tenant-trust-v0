const numberWithSpaces = (x) => {
  return Math.floor(x)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};
export { numberWithSpaces };
