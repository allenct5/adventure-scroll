// canvas.js — Single source of truth for the shared canvas and 2D context.
// Import ctx from here instead of calling getContext('2d') in every module.

export const canvas = document.getElementById('gameCanvas');
export const ctx    = canvas.getContext('2d');
