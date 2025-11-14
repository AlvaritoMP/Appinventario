import React, { useState, useMemo } from 'react';
import { useInventoryState, useInventoryDispatch } from '../context/InventoryContext';
import { ScheduledPurchase, Supplier, Product, ScheduledPurchaseItem, Warehouse } from '../types';
import { ICONS } from '../constants';

// UI Components
const Card = ({ children, className = '' }: { children?: React.ReactNode, className?: string }) => (
  <div className={`bg-gray-800 border border-gray-700 rounded-lg shadow-md p-6 ${className}`}>
    {children}
  </div>
);
const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-3xl' }: { isOpen: boolean, onClose: () => void, title: string, children?: React.ReactNode, maxWidth?: string }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className={`bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full ${maxWidth} mx-auto`} onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">{ICONS.close}</button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
const Button = ({ children, onClick, className = 'bg-blue-600 hover:bg-blue-700', type = 'button', disabled = false, title }: { children?: React.ReactNode, onClick?: () => void, className?: string, type?: 'button' | 'submit' | 'reset', disabled?: boolean, title?: string }) => (
  <button type={type} onClick={onClick} disabled={disabled} title={title} className={`flex items-center justify-center gap-2 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>
    {children}
  </button>
);
const Input = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
    <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
        <input {...props} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 transition" />
    </div>
);
const Textarea = ({ label, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) => (
    <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
        <textarea {...props} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 transition" />
    </div>
);

const ScheduledPurchaseFormModal = ({ purchase, date, onClose, onSave, onDelete, onGeneratePO }: { purchase: ScheduledPurchase | null, date: string, onClose: () => void, onSave: (data: ScheduledPurchase | Omit<ScheduledPurchase, 'id'>) => void, onDelete?: (id: string) => void, onGeneratePO: (schedule: ScheduledPurchase) => void }) => {
    const { suppliers, products, currentUser } = useInventoryState();
    const [formData, setFormData] = useState({
        title: purchase?.title || '',
        supplierId: purchase?.supplierId || '',
        notes: purchase?.notes || ''
    });
    const [items, setItems] = useState<ScheduledPurchaseItem[]>(purchase?.items || []);
    const [searchTerm, setSearchTerm] = useState('');

    const availableProducts = useMemo(() => {
        const currentItemIds = items.map(i => i.productId);
        return products.filter(p => !currentItemIds.includes(p.id));
    }, [products, items]);

    const searchResults = useMemo(() => {
        if (!searchTerm) return [];
        return availableProducts
            .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
            .slice(0, 5);
    }, [searchTerm, availableProducts]);

    const handleAddItem = (product: Product) => {
        setItems([...items, {
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            quantity: 1,
        }]);
        setSearchTerm('');
    };

    const handleItemQuantityChange = (productId: string, quantity: number) => {
        setItems(items.map(item => item.productId === productId ? { ...item, quantity: Math.max(1, quantity) } : item));
    };

    const handleRemoveItem = (productId: string) => {
        setItems(items.filter(item => item.productId !== productId));
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        const payload = { date, ...formData, items, createdBy: currentUser.name };
        if (purchase) {
            onSave({ ...purchase, ...payload });
        } else {
            onSave(payload);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={purchase ? 'Editar Compra Agendada' : 'Agendar Nueva Compra'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <p className="col-span-2 text-lg font-semibold text-white">Fecha: {new Date(date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <Input label="Título / Concepto" name="title" value={formData.title} onChange={handleChange} required />
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Proveedor (Opcional)</label>
                        <select name="supplierId" value={formData.supplierId} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2">
                            <option value="">Ninguno</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>
                
                <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 space-y-4">
                    <h3 className="text-lg font-semibold text-white">Productos a Comprar</h3>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar producto para añadir..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2"
                        />
                        {searchResults.length > 0 && (
                            <ul className="absolute z-10 w-full bg-gray-800 border border-gray-600 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto">
                                {searchResults.map(p => (
                                    <li key={p.id} onClick={() => handleAddItem(p)} className="px-4 py-2 hover:bg-gray-700 cursor-pointer text-sm">{p.name}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                        {items.map(item => (
                            <div key={item.productId} className="flex items-center gap-4 py-2 border-b border-gray-700">
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-white">{item.productName}</p>
                                    <p className="text-xs text-gray-500 font-mono">{item.sku}</p>
                                </div>
                                <input type="number" value={item.quantity} onChange={e => handleItemQuantityChange(item.productId, parseInt(e.target.value) || 1)} className="w-24 bg-gray-700 border-gray-600 rounded px-2 py-1 text-right" min="1" />
                                <button type="button" onClick={() => handleRemoveItem(item.productId)} className="p-1 text-red-500 hover:text-red-400">{ICONS.trash}</button>
                            </div>
                        ))}
                    </div>
                </div>

                <Textarea label="Notas Adicionales" name="notes" value={formData.notes} onChange={handleChange} rows={2} />

                <div className="flex justify-between items-center pt-4">
                    <div>
                        {purchase && onDelete && (
                            <Button onClick={() => onDelete(purchase.id)} className="bg-red-800 hover:bg-red-700">{ICONS.trash} Eliminar</Button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        {purchase && <Button onClick={() => onGeneratePO(purchase)} className="bg-green-600 hover:bg-green-700" type="button" disabled={!purchase.supplierId || purchase.items.length === 0}>Generar OC</Button>}
                        <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-700">Cancelar</Button>
                        <Button type="submit">{purchase ? 'Guardar Cambios' : 'Agendar Compra'}</Button>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

const GeneratePOFromScheduleModal = ({ schedule, onClose }: { schedule: ScheduledPurchase, onClose: () => void }) => {
    const { warehouses, myCompanies } = useInventoryState();
    const dispatch = useInventoryDispatch();
    const [destinationWarehouseId, setDestinationWarehouseId] = useState('');
    const [issuingCompanyId, setIssuingCompanyId] = useState(myCompanies[0]?.id || '');
    
    const handleGenerate = () => {
        if(!destinationWarehouseId || !issuingCompanyId || !schedule.supplierId) return;

        const poItems = schedule.items.map(item => {
            // Se asume que el precio se definirá en la OC. Aquí ponemos 0.
            return { ...item, price: 0 };
        });

        dispatch({
            type: 'ADD_PURCHASE_ORDER',
            payload: {
                purchaseOrderData: {
                    supplierId: schedule.supplierId,
                    issuingCompanyId,
                    destinationWarehouseId,
                    issueDate: new Date().toISOString(),
                    deliveryDate: schedule.date,
                    items: poItems,
                }
            }
        });
        
        dispatch({ type: 'DELETE_SCHEDULED_PURCHASE', payload: { purchaseId: schedule.id } });
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Generar Orden de Compra" maxWidth="max-w-md">
            <div className="space-y-4">
                <p>Se generará una OC para <span className="font-bold text-white">{schedule.title}</span>.</p>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Empresa Emisora</label>
                    <select value={issuingCompanyId} onChange={e => setIssuingCompanyId(e.target.value)} required className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2">
                        {myCompanies.map(c => <option key={c.id} value={c.id}>{c.profileName}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Almacén de Destino</label>
                    <select value={destinationWarehouseId} onChange={e => setDestinationWarehouseId(e.target.value)} required className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2">
                        <option value="">Seleccione...</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </div>
                 <div className="flex justify-end pt-4 gap-3">
                    <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-700">Cancelar</Button>
                    <Button onClick={handleGenerate} disabled={!destinationWarehouseId || !issuingCompanyId}>Confirmar y Generar</Button>
                </div>
            </div>
        </Modal>
    );
};


export const PurchaseCalendarView = () => {
    const { scheduledPurchases, suppliers } = useInventoryState();
    const dispatch = useInventoryDispatch();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [formModalInfo, setFormModalInfo] = useState<{ isOpen: boolean, date: string, purchase: ScheduledPurchase | null }>({ isOpen: false, date: '', purchase: null });
    const [poGenModalInfo, setPoGenModalInfo] = useState<{isOpen: boolean, schedule: ScheduledPurchase | null}>({isOpen: false, schedule: null});

    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const daysInMonth = useMemo(() => {
        const days = [];
        const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
        const totalDays = lastDayOfMonth.getDate();
        for (let i = 0; i < startDayOfWeek; i++) days.push({ day: null, date: null });
        for (let i = 1; i <= totalDays; i++) days.push({ day: i, date: new Date(currentDate.getFullYear(), currentDate.getMonth(), i) });
        return days;
    }, [currentDate]);

    const eventsByDate = useMemo(() => {
        const map = new Map<string, ScheduledPurchase[]>();
        scheduledPurchases.forEach(p => {
            const date = p.date;
            if (!map.has(date)) map.set(date, []);
            map.get(date)?.push(p);
        });
        return map;
    }, [scheduledPurchases]);

    const handleDateClick = (date: Date) => setFormModalInfo({ isOpen: true, date: date.toISOString().split('T')[0], purchase: null });
    const handleEventClick = (purchase: ScheduledPurchase) => setFormModalInfo({ isOpen: true, date: purchase.date, purchase });
    const handleCloseModal = () => setFormModalInfo({ isOpen: false, date: '', purchase: null });

    const handleSave = (data: ScheduledPurchase | Omit<ScheduledPurchase, 'id'>) => {
        if ('id' in data) {
            dispatch({ type: 'UPDATE_SCHEDULED_PURCHASE', payload: { purchase: data } });
        } else {
            dispatch({ type: 'ADD_SCHEDULED_PURCHASE', payload: { purchase: data } });
        }
        handleCloseModal();
    };

    const handleDelete = (id: string) => {
        if (window.confirm('¿Seguro que desea eliminar esta compra agendada?')) {
            dispatch({ type: 'DELETE_SCHEDULED_PURCHASE', payload: { purchaseId: id } });
            handleCloseModal();
        }
    };

    const handleGeneratePO = (schedule: ScheduledPurchase) => {
        setPoGenModalInfo({ isOpen: true, schedule });
        handleCloseModal(); // Cierra el modal de edición
    };

    const changeMonth = (offset: number) => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));

    const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Calendario de Compras</h1>
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <Button onClick={() => changeMonth(-1)} className="bg-gray-700 hover:bg-gray-600">&lt;</Button>
                    <h2 className="text-xl font-bold text-white capitalize">{currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</h2>
                    <Button onClick={() => changeMonth(1)} className="bg-gray-700 hover:bg-gray-600">&gt;</Button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-sm text-gray-400">
                    {weekdays.map(day => <div key={day} className="py-2 font-semibold">{day}</div>)}
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {daysInMonth.map((dayInfo, index) => {
                        const isToday = dayInfo.date?.getTime() === today.getTime();
                        const dateString = dayInfo.date?.toISOString().split('T')[0];
                        const events = dateString ? eventsByDate.get(dateString) || [] : [];
                        
                        return (
                            <div
                                key={index}
                                className={`h-36 rounded-lg border border-gray-700/50 p-2 flex flex-col transition-colors ${dayInfo.day ? 'bg-gray-800/50 hover:bg-gray-700/50 cursor-pointer' : 'bg-transparent'}`}
                                onClick={() => dayInfo.date && handleDateClick(dayInfo.date)}
                            >
                                {dayInfo.day && (
                                    <>
                                        <span className={`font-bold ${isToday ? 'bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center' : ''}`}>{dayInfo.day}</span>
                                        <div className="mt-1 space-y-1 overflow-y-auto">
                                            {events.map(event => (
                                                <div
                                                    key={event.id}
                                                    onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}
                                                    className="bg-blue-900/70 p-1.5 rounded-md text-left text-xs cursor-pointer hover:bg-blue-800"
                                                >
                                                    <p className="font-semibold text-white truncate">{event.title}</p>
                                                    <p className="text-blue-300 text-xs truncate">por: {event.createdBy}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )
                    })}
                </div>
            </Card>
            {formModalInfo.isOpen && <ScheduledPurchaseFormModal purchase={formModalInfo.purchase} date={formModalInfo.date} onClose={handleCloseModal} onSave={handleSave} onDelete={handleDelete} onGeneratePO={handleGeneratePO} />}
            {poGenModalInfo.isOpen && poGenModalInfo.schedule && <GeneratePOFromScheduleModal schedule={poGenModalInfo.schedule} onClose={() => setPoGenModalInfo({isOpen: false, schedule: null})} />}
        </div>
    );
};