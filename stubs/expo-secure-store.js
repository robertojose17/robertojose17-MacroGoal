// Stub for expo-secure-store — native module not linked in preview build
const store = {};
const getItemAsync = (key) => Promise.resolve(store[key] ?? null);
const setItemAsync = (key, value) => { store[key] = value; return Promise.resolve(); };
const deleteItemAsync = (key) => { delete store[key]; return Promise.resolve(); };
const isAvailableAsync = () => Promise.resolve(false);
module.exports = { getItemAsync, setItemAsync, deleteItemAsync, isAvailableAsync, default: { getItemAsync, setItemAsync, deleteItemAsync, isAvailableAsync } };
