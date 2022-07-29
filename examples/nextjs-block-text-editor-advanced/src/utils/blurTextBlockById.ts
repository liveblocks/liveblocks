const blurTextBlockById = (id: string) => {
  const element = document.getElementById(id);

  if (!element) {
    return;
  }

  element.blur();
};

export default blurTextBlockById;
