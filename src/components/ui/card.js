// src/components/ui/card.js
import React from 'react';

export const Card = ({ children }) => (
  <div className="border rounded-lg shadow-sm p-4">{children}</div>
);

export const CardHeader = ({ children }) => (
  <div className="border-b pb-2 mb-4">{children}</div>
);

export const CardTitle = ({ children }) => (
  <h2 className="text-xl font-semibold">{children}</h2>
);

export const CardContent = ({ children }) => (
  <div className="mt-4">{children}</div>
);