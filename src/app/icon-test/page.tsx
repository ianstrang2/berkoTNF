'use client';
import React from 'react';

export default function IconTestPage() {
  return (
    <div className="p-10 bg-white">
      <h1 className="text-3xl font-bold mb-6">Nucleo Icons Test</h1>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Basic Icons</h2>
          <div className="flex space-x-4 text-3xl">
            <i className="ni ni-diamond"></i>
            <i className="ni ni-single-02"></i>
            <i className="ni ni-zoom-split-in"></i>
            <i className="ni ni-button-power"></i>
            <i className="ni ni-settings-gear-65"></i>
          </div>
        </div>
        
        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Styled Icons</h2>
          <div className="flex space-x-4 text-3xl">
            <i className="ni ni-diamond text-red-500"></i>
            <i className="ni ni-single-02 text-blue-500"></i>
            <i className="ni ni-zoom-split-in text-green-500"></i>
            <i className="ni ni-button-power text-purple-500"></i>
            <i className="ni ni-settings-gear-65 text-orange-500"></i>
          </div>
        </div>
      </div>
      
      <div className="mt-8 p-6 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Font-family Check</h2>
        <p>The current font-family for icons should be: <code className="bg-gray-100 p-1 rounded">NucleoIcons</code></p>
        
        <div className="mt-4">
          <div id="fontTest" className="ni ni-diamond text-4xl"></div>
          <button 
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md"
            onClick={() => {
              const el = document.getElementById('fontTest');
              if (el) {
                const computedFont = window.getComputedStyle(el).fontFamily;
                alert(`Computed font-family: ${computedFont}`);
              }
            }}
          >
            Check computed font-family
          </button>
        </div>
      </div>
    </div>
  );
} 