import React, { useState } from 'react';
import { useInventoryState, useInventoryDispatch } from '../context/InventoryContext';
import { Supplier } from '../types';
import { ICONS } from '../constants';

// Reusable UI Components (similar to App.tsx)
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

const Button = ({ children, onClick, className = 'bg-blue-600 hover:bg-blue-700', type = 'button', disabled = false }: { children?: React.ReactNode, onClick?: () => void, className?: string, type?: 'button' | 'submit' | 'reset', disabled?: boolean }) => (
  <button type={type} onClick={onClick} disabled={disabled} className={`flex items-center justify-center gap-2 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>
    {children}
  </button>
);

const Input = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
    <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
        <input {...props} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 transition" />
    </div>
);

const SupplierFormModal = ({ supplier, onClose, onSave }: { supplier: Supplier | null, onClose: () => void, onSave: (data: Supplier | Omit<Supplier, 'id'>) => void }) => {
    const [formData, setFormData] = useState({
        name: supplier?.name || '',
        ruc: supplier?.ruc || '',
        address: supplier?.address || '',
        contactPerson: supplier?.contactPerson || '',
        contactEmail: supplier?.contactEmail || '',
        contactPhone: supplier?.contactPhone || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (supplier) {
            onSave({ ...supplier, ...formData });
        } else {
            onSave(formData);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={supplier ? 'Editar Proveedor' : 'Añadir Proveedor'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Nombre de la Empresa" name="name" value={formData.name} onChange={handleChange} required />
                <Input label="RUC" name="ruc" value={formData.ruc} onChange={handleChange} required />
                <Input label="Dirección" name="address" value={formData.address} onChange={handleChange} />
                <Input label="Persona de Contacto" name="contactPerson" value={formData.contactPerson} onChange={handleChange} />
                <Input label="Email de Contacto" name="contactEmail" type="email" value={formData.contactEmail} onChange={handleChange} />
                <Input label="Teléfono de Contacto" name="contactPhone" value={formData.contactPhone} onChange={handleChange} />
                <div className="flex justify-end pt-4 gap-3">
                    <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-700">Cancelar</Button>
                    <Button type="submit">{supplier ? 'Guardar Cambios' : 'Añadir Proveedor'}</Button>
                </div>
            </form>
        </Modal>
    );
};


export const SuppliersView = () => {
    const { suppliers } = useInventoryState();
    const dispatch = useInventoryDispatch();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

    const handleSave = (data: Supplier | Omit<Supplier, 'id'>) => {
        if ('id' in data) {
            dispatch({ type: 'UPDATE_SUPPLIER', payload: { supplier: data } });
        } else {
            dispatch({ type: 'ADD_SUPPLIER', payload: { supplier: data } });
        }
        setIsModalOpen(false);
        setEditingSupplier(null);
    };

    const handleEdit = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Gestión de Proveedores</h1>
                <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                    {ICONS.plus}
                    Añadir Proveedor
                </Button>
            </div>
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-gray-700 text-sm text-gray-400">
                            <tr>
                                <th className="p-4">Proveedor</th>
                                <th className="p-4">RUC</th>
                                <th className="p-4">Contacto</th>
                                <th className="p-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {suppliers.map(supplier => (
                                <tr key={supplier.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                                    <td className="p-4">
                                        <p className="font-semibold text-white">{supplier.name}</p>
                                        <p className="text-xs text-gray-500">{supplier.address}</p>
                                    </td>
                                    <td className="p-4 font-mono">{supplier.ruc}</td>
                                    <td className="p-4">
                                        <p className="text-white">{supplier.contactPerson}</p>
                                        <p className="text-xs text-gray-400">{supplier.contactEmail}</p>
                                        <p className="text-xs text-gray-400">{supplier.contactPhone}</p>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex justify-center items-center gap-2">
                                            <Button onClick={() => handleEdit(supplier)} className="bg-gray-700 hover:bg-gray-600 p-2">{ICONS.edit}</Button>
                                            {/* Delete button can be added here */}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
            {isModalOpen && <SupplierFormModal supplier={editingSupplier} onClose={() => { setIsModalOpen(false); setEditingSupplier(null); }} onSave={handleSave} />}
        </div>
    );
};