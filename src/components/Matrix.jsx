import React, { useEffect, useRef } from 'react';

const Matrix = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.height = window.innerHeight;
    canvas.width = window.innerWidth;
    var ethSymbols = "Ξ⧫⬨⟠"
    var matrix = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%+-/~{[|`]}";
    matrix = matrix.split("");
    ethSymbols = ethSymbols.split("");

    var font_size = 10;
    var columns = canvas.width/font_size;
    var drops = [];
    for(var x = 0; x < columns; x++)
        drops[x] = 1; 

    function draw()
    {
        ctx.fillStyle = "rgba(0, 0, 0, 0.04)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        for(var i = 0; i < drops.length; i++)
        {
            var useEthSymbol = Math.random() < 0.01;
            var text = useEthSymbol ? ethSymbols[Math.floor(Math.random()*ethSymbols.length)] : matrix[Math.floor(Math.random()*matrix.length)];
            ctx.fillStyle = useEthSymbol ? "#9dfbff" : "#06bf0f";
            ctx.font = font_size + "px arial";
            ctx.fillText(text, i*font_size, drops[i]*font_size);
            if(drops[i]*font_size > canvas.height && Math.random() > 0.975)
                drops[i] = 0;
            drops[i]++;
        }
    }

    const interval = setInterval(draw, 35);

    return () => clearInterval(interval);
  }, []);

  return <canvas ref={canvasRef} style={{position: 'fixed', top: 0, left: 0, zIndex: -1}} />;
};

export default Matrix;