import React, { useState, useEffect } from 'react';
import { useInventoryState, useInventoryDispatch } from '../context/InventoryContext';
import { AppSettings, ColorSettings, CompanyInfoDetails, MyCompany } from '../types';
import { ICONS } from '../constants';

// UI Components
const Card = ({ children, className = '' }: { children?: React.ReactNode, className?: string }) => (
  <div className={`bg-gray-800 border border-gray-700 rounded-lg shadow-md p-6 ${className}`}>
    {children}
  </div>
);

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }: { isOpen: boolean, onClose: () => void, title: string, children?: React.ReactNode, maxWidth?: string }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className={`bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full ${maxWidth} mx-auto`} onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">{ICONS.close}</button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

const Button = ({ children, onClick, className = 'bg-blue-600 hover:bg-blue-700', type = 'button', disabled = false, title }: { children?: React.ReactNode, onClick?: () => void, className?: string, type?: 'button' | 'submit' | 'reset', disabled?: boolean, title?: string }) => (
  <button type={type} onClick={onClick} disabled={disabled} title={title} className={`flex items-center justify-center gap-2 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>
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

const MyCompanyFormModal = ({ company, onClose, onSave }: { company: MyCompany | null, onClose: () => void, onSave: (data: MyCompany | Omit<MyCompany, 'id'>) => void }) => {
    const [profileName, setProfileName] = useState(company?.profileName || '');
    const [details, setDetails] = useState<CompanyInfoDetails>(company?.details || []);

    const handleDetailChange = (index: number, field: 'label' | 'value', value: string) => {
        const updatedDetails = [...details];
        updatedDetails[index] = { ...updatedDetails[index], [field]: value };
        setDetails(updatedDetails);
    };

    const handleAddDetail = () => {
        setDetails([...details, { label: 'Nuevo Campo', value: '' }]);
    };

    const handleRemoveDetail = (index: number) => {
        setDetails(details.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const companyData = { profileName, details };
        if (company) {
            onSave({ ...company, ...companyData });
        } else {
            onSave(companyData);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={company ? 'Editar Perfil de Empresa' : 'Añadir Perfil de Empresa'} maxWidth="max-w-2xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Nombre del Perfil (uso interno)" value={profileName} onChange={e => setProfileName(e.target.value)} required />
                
                <div className="space-y-2 pt-2">
                    <label className="block text-sm font-medium text-gray-400">Detalles de la Empresa</label>
                    {details.map((field, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={field.label}
                                onChange={(e) => handleDetailChange(index, 'label', e.target.value)}
                                className="w-1/3 bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 font-semibold"
                                placeholder="Etiqueta"
                            />
                            <input
                                type="text"
                                value={field.value}
                                onChange={(e) => handleDetailChange(index, 'value', e.target.value)}
                                className="flex-1 bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2"
                                placeholder="Valor"
                            />
                            <Button type="button" onClick={() => handleRemoveDetail(index)} className="bg-red-800 hover:bg-red-700 p-2.5">
                                {ICONS.trash}
                            </Button>
                        </div>
                    ))}
                    <Button type="button" onClick={handleAddDetail} className="bg-gray-600 hover:bg-gray-700 text-sm py-1.5 px-3">
                        {ICONS.plus}
                        Añadir Detalle
                    </Button>
                </div>

                <div className="flex justify-end pt-4 gap-3">
                    <Button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-700">Cancelar</Button>
                    <Button type="submit">{company ? 'Guardar Cambios' : 'Crear Perfil'}</Button>
                </div>
            </form>
        </Modal>
    );
};

const CompanyInfoManager = () => {
    const { myCompanies } = useInventoryState();
    const dispatch = useInventoryDispatch();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<MyCompany | null>(null);

    const handleSave = (data: MyCompany | Omit<MyCompany, 'id'>) => {
        if ('id' in data) {
            dispatch({ type: 'UPDATE_MY_COMPANY', payload: { company: data } });
        } else {
            dispatch({ type: 'ADD_MY_COMPANY', payload: { company: data } });
        }
        setIsModalOpen(false);
        setEditingCompany(null);
    };
    
    const handleEdit = (company: MyCompany) => {
        setEditingCompany(company);
        setIsModalOpen(true);
    };

    const handleDelete = (companyId: string) => {
        if (window.confirm('¿Está seguro de que desea eliminar este perfil de empresa?')) {
            dispatch({ type: 'DELETE_MY_COMPANY', payload: { companyId } });
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Perfiles de Empresa</h3>
                <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                    {ICONS.plus}
                    Añadir Perfil
                </Button>
            </div>
            <div className="space-y-4">
                {myCompanies.map(company => (
                    <div key={company.id} className="bg-gray-900/50 p-4 rounded-lg flex justify-between items-start">
                        <div>
                            <p className="font-bold text-white">{company.profileName}</p>
                            <p className="text-sm text-gray-400">{company.details.find(d => d.label === "Razón Social")?.value || 'Sin Razón Social'}</p>
                            <p className="text-xs text-gray-500 font-mono">{company.details.find(d => d.label === "RUC")?.value || 'Sin RUC'}</p>
                        </div>
                        <div className="flex gap-2">
                             <Button onClick={() => handleEdit(company)} className="bg-gray-700 hover:bg-gray-600 p-2" title="Editar">{ICONS.edit}</Button>
                             <Button onClick={() => handleDelete(company.id)} className="bg-red-800 hover:bg-red-700 p-2" title="Eliminar" disabled={myCompanies.length <= 1}>{ICONS.trash}</Button>
                        </div>
                    </div>
                ))}
            </div>
            {isModalOpen && <MyCompanyFormModal company={editingCompany} onClose={() => { setIsModalOpen(false); setEditingCompany(null); }} onSave={handleSave} />}
        </div>
    );
};

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
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-white">Configuración</h1>
            <Card>
                <h2 className="text-2xl font-bold text-white mb-6">Personalización del Sistema</h2>
                <div className="space-y-8">
                    {/* Editor de Información de la Empresa */}
                    <CompanyInfoManager />

                    <div className="border-t border-gray-700 pt-8">
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

                    <div className="border-t border-gray-700 pt-8">
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
                        {showSuccess && <p className="text-green-400 text-sm">¡Configuración general guardada!</p>}
                        <Button onClick={handleSave}>Guardar Configuración General</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};