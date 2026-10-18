// kds.js

/* -------------------------------------------------------
   Gaussian KDE
------------------------------------------------------- */
export function gaussianKernel(x)
{
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

export function computeKDE(xs, counts, bandwidth = 45)
{
    const kdeValues = xs.map(x0 =>
       {
        let sum = 0;
        for (let i = 0; i < xs.length; i++)
        {
            const u = (x0 - xs[i]) / bandwidth;
            sum += counts[i] * gaussianKernel(u);
        }
        return sum;
    });
   
    return kdeValues;
}
