export const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString();
};

export const formatDateTime = (date: Date | string) => {
  return new Date(date).toLocaleString();
};