import React, { useState, useEffect } from 'react';
import { useInventoryState, useInventoryDispatch } from '../context/InventoryContext';
import { AppSettings, ColorSettings } from '../types';

// UI Components Reutilizables (podrían moverse a un archivo común)
// FIX: Made children prop optional to resolve TypeScript errors.
const Card = ({ children, className = '' }: { children?: React.ReactNode, className?: string }) => (
  <div className={`bg-gray-800 border border-gray-700 rounded-lg shadow-md p-6 ${className}`}>
    {children}
  </div>
);
// FIX: Made children prop optional to resolve TypeScript errors.
const Button = ({ children, onClick, className = 'bg-blue-600 hover:bg-blue-700', type = 'button', disabled = false }: { children?: React.ReactNode, onClick?: () => void, className?: string, type?: 'button' | 'submit' | 'reset', disabled?: boolean }) => (
  <button type={type} onClick={onClick} disabled={disabled} className={`flex items-center justify-center gap-2 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>
    {children}
  </button>
);
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label: string }>(({ label, ...props }, ref) => (
    <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
        <input ref={ref} {...props} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 transition" />
    </div>
));

const colorPalettes: { name: string, settings: ColorSettings }[] = [
    {
        name: 'Clásico',
        settings: {
            inStock: 'bg-green-500/20 text-green-400 border-green-500/30',
            lowStock: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
            outOfStock: 'bg-red-500/20 text-red-400 border-red-500/30',
        },
    },
    {
        name: 'Vibrante',
        settings: {
            inStock: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
            lowStock: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
            outOfStock: 'bg-pink-600/20 text-pink-400 border-pink-600/30',
        },
    },
    {
        name: 'Moderno',
        settings: {
            inStock: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
            lowStock: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            outOfStock: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
        },
    },
];

export const SettingsView = () => {
    const { settings } = useInventoryState();
    const dispatch = useInventoryDispatch();
    const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSave = () => {
        dispatch({ type: 'UPDATE_SETTINGS', payload: { settings: localSettings } });
        setShowSuccess(true);
    };

    useEffect(() => {
        if (showSuccess) {
            const timer = setTimeout(() => setShowSuccess(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showSuccess]);

    return (
        <Card>
            <h2 className="text-2xl font-bold text-white mb-6">Configuración del Sistema</h2>

            <div className="space-y-8">
                {/* Configuración de Colores */}
                <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Paleta de Colores de Alertas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {colorPalettes.map(palette => (
                            <div key={palette.name}
                                 onClick={() => setLocalSettings(s => ({ ...s, colors: palette.settings }))}
                                 className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${JSON.stringify(localSettings.colors) === JSON.stringify(palette.settings) ? 'border-blue-500 bg-gray-700/50' : 'border-gray-700 hover:border-gray-600'}`}>
                                <h4 className="font-semibold text-white mb-3 text-center">{palette.name}</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-400">En Stock</span>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${palette.settings.inStock}`}>100</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-400">Stock Bajo</span>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${palette.settings.lowStock}`}>5</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-400">Agotado</span>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${palette.settings.outOfStock}`}>0</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Configuración de Alertas */}
                <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Configuración de Alertas</h3>
                    <div className="max-w-sm">
                        <Input
                            label="Umbral de Stock Bajo por Defecto para Nuevos Productos"
                            type="number"
                            value={localSettings.alerts.defaultLowStockThreshold}
                            onChange={e => {
                                const value = parseInt(e.target.value, 10);
                                setLocalSettings(s => ({ ...s, alerts: { ...s.alerts, defaultLowStockThreshold: isNaN(value) ? 0 : value } }))
                            }}
                        />
                         <p className="text-xs text-gray-500 mt-1">Este valor se usará al crear un nuevo producto.</p>
                    </div>
                </div>

                 {/* Botón de Guardar */}
                <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-700">
                    {showSuccess && <p className="text-green-400 text-sm">¡Configuración guardada con éxito!</p>}
                    <Button onClick={handleSave}>Guardar Cambios</Button>
                </div>
            </div>
        </Card>
    );
};