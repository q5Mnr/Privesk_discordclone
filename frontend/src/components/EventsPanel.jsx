import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Plus, X, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiGet, apiPost, apiDelete } from '../utils/api';

function CreateEventModal({ onClose, onCreate, serverId }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !startDate || !startTime) return;
    const start_time = `${startDate}T${startTime}:00`;
    const end_time = endDate && endTime ? `${endDate}T${endTime}:00` : null;
    await onCreate({ title, description, start_time, end_time, location });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-discord-darker border border-discord-light/20 rounded-2xl p-5 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-discord-white">Создать событие</h3>
          <button onClick={onClose} className="text-discord-muted hover:text-discord-white p-1 rounded-xl hover:bg-discord-light/30 transition-all"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Название события" autoFocus
            className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-4 py-2.5 text-discord-text text-sm focus:outline-none focus:border-discord-accent/50 transition-colors" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Описание"
            className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-4 py-2.5 text-discord-text text-sm focus:outline-none resize-none h-16 focus:border-discord-accent/50 transition-colors" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-discord-muted mb-1 block">Начало</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-3 py-2 text-discord-text text-sm focus:outline-none focus:border-discord-accent/50 transition-colors" />
            </div>
            <div>
              <label className="text-xs text-discord-muted mb-1 block">&nbsp;</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-3 py-2 text-discord-text text-sm focus:outline-none focus:border-discord-accent/50 transition-colors" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-discord-muted mb-1 block">Конец</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-3 py-2 text-discord-text text-sm focus:outline-none focus:border-discord-accent/50 transition-colors" />
            </div>
            <div>
              <label className="text-xs text-discord-muted mb-1 block">&nbsp;</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-3 py-2 text-discord-text text-sm focus:outline-none focus:border-discord-accent/50 transition-colors" />
            </div>
          </div>
          <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Место (необязательно)"
            className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-4 py-2.5 text-discord-text text-sm focus:outline-none focus:border-discord-accent/50 transition-colors" />
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm text-discord-muted hover:text-discord-white border border-discord-light/30 rounded-xl transition-colors">Отмена</button>
            <button type="submit" disabled={!title || !startDate || !startTime} className="flex-1 px-4 py-2.5 text-sm bg-gradient-to-r from-discord-blurple to-discord-gradient2 hover:opacity-90 text-white rounded-xl font-medium disabled:opacity-50 transition-all shadow-lg">Создать</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EventsPanel({ serverId, onClose, onOpenThread }) {
  const [events, setEvents] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [view, setView] = useState('list');
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  useEffect(() => { if (serverId) loadEvents(); }, [serverId]);

  const loadEvents = async () => {
    try {
      const data = await apiGet(`/api/events/server/${serverId}`);
      setEvents(data);
    } catch (err) { console.error(err); }
  };

  const handleCreate = async (eventData) => {
    try {
      await apiPost('/api/events', { server_id: serverId, ...eventData });
      setShowCreate(false);
      loadEvents();
    } catch (err) { console.error(err); }
  };

  const handleRsvp = async (eventId, status) => {
    try {
      await apiPost(`/api/events/${eventId}/rsvp`, { status });
      loadEvents();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (eventId) => {
    if (!confirm('Удалить событие?')) return;
    try {
      await apiDelete(`/api/events/${eventId}`);
      loadEvents();
    } catch (err) { console.error(err); }
  };

  const formatDate = (dt) => {
    if (!dt) return '';
    const d = new Date(dt + 'Z');
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  };

  const isPast = (dt) => dt && new Date(dt + 'Z') < new Date();

  const upcoming = events.filter(e => !isPast(e.start_time));
  const past = events.filter(e => isPast(e.start_time));

  const calDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  };

  const eventsOnDay = (day) => {
    if (!day) return [];
    const y = calendarMonth.getFullYear();
    const m = calendarMonth.getMonth();
    return events.filter(e => {
      const d = new Date(e.start_time + 'Z');
      return d.getFullYear() === y && d.getMonth() === m && d.getDate() === day;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-discord-darker border border-discord-light/20 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="h-16 px-6 flex items-center border-b border-discord-light/20 flex-shrink-0 gap-3">
          <Calendar size={18} className="text-discord-accent" />
          <h3 className="text-discord-white font-semibold flex-1">События сервера</h3>
          <div className="flex gap-1">
            <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${view === 'list' ? 'bg-gradient-to-r from-discord-blurple to-discord-gradient2 text-white shadow-lg' : 'text-discord-muted hover:text-discord-white hover:bg-discord-light/30'}`}>Список</button>
            <button onClick={() => setView('calendar')} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${view === 'calendar' ? 'bg-gradient-to-r from-discord-blurple to-discord-gradient2 text-white shadow-lg' : 'text-discord-muted hover:text-discord-white hover:bg-discord-light/30'}`}>Календарь</button>
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-discord-blurple to-discord-gradient2 hover:opacity-90 text-white text-xs font-medium transition-all shadow-lg">
            <Plus size={14} /> Новое
          </button>
          <button onClick={onClose} className="text-discord-muted hover:text-discord-white ml-1 p-1.5 rounded-xl hover:bg-discord-light/30 transition-all"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {view === 'calendar' ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))} className="text-discord-muted hover:text-discord-white p-1.5 rounded-xl hover:bg-discord-light/30 transition-all"><ChevronLeft size={20} /></button>
                <h4 className="text-discord-white font-semibold">{calendarMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</h4>
                <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))} className="text-discord-muted hover:text-discord-white p-1.5 rounded-xl hover:bg-discord-light/30 transition-all"><ChevronRight size={20} /></button>
              </div>
              <div className="grid grid-cols-7 gap-px bg-discord-light/20 rounded-xl overflow-hidden">
                {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
                  <div key={d} className="bg-discord-darker px-1 py-2 text-center text-xs text-discord-muted font-semibold">{d}</div>
                ))}
                {calDays().map((day, i) => {
                  const dayEvents = eventsOnDay(day);
                  const isToday = day && new Date().getDate() === day && new Date().getMonth() === calendarMonth.getMonth();
                  return (
                    <div key={i} className={`bg-discord-darker min-h-[60px] p-1 ${isToday ? 'ring-1 ring-discord-accent' : ''}`}>
                      {day && (
                        <>
                          <div className={`text-xs mb-1 ${isToday ? 'text-discord-accent font-bold' : 'text-discord-muted'}`}>{day}</div>
                          {dayEvents.map(ev => (
                            <div key={ev.id} className="text-[9px] bg-discord-accent/20 text-discord-accent rounded-lg px-1 py-0.5 truncate mb-0.5 cursor-pointer hover:bg-discord-accent/30" title={ev.title}>
                              {ev.title}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {upcoming.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-discord-muted uppercase mb-2">Предстоящие</h4>
                  {upcoming.map(ev => (
                    <div key={ev.id} className="bg-discord-dark border border-discord-light/20 rounded-xl p-3 mb-2 hover:border-discord-accent/30 transition-all">
                      <div className="flex items-start gap-3">
                        <div className="bg-discord-accent/20 rounded-xl p-2 text-center flex-shrink-0 w-14">
                          <div className="text-discord-accent text-xl font-bold">{new Date(ev.start_time + 'Z').getDate()}</div>
                          <div className="text-discord-accent text-[10px] uppercase">{new Date(ev.start_time + 'Z').toLocaleDateString('ru-RU', { month: 'short' })}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-discord-white font-semibold text-[15px] truncate">{ev.title}</h5>
                          {ev.description && <p className="text-discord-muted text-xs mt-0.5 truncate">{ev.description}</p>}
                          <div className="flex items-center gap-3 mt-1 text-xs text-discord-muted">
                            <span className="flex items-center gap-1"><Clock size={11} /> {formatDate(ev.start_time)}</span>
                            {ev.location && <span className="flex items-center gap-1"><MapPin size={11} /> {ev.location}</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <button onClick={() => handleRsvp(ev.id, 'going')} className="px-2.5 py-1 rounded-xl text-xs font-medium bg-discord-green/20 text-discord-green hover:bg-discord-green/30 transition-colors">
                              <Users size={11} className="inline mr-1" />{ev.going_count || 0} Иду
                            </button>
                            <button onClick={() => handleRsvp(ev.id, 'maybe')} className="px-2.5 py-1 rounded-xl text-xs font-medium bg-discord-yellow/20 text-discord-yellow hover:bg-discord-yellow/30 transition-colors">
                              Возможно
                            </button>
                            <button onClick={() => handleRsvp(ev.id, 'not_going')} className="px-2.5 py-1 rounded-xl text-xs font-medium bg-discord-light/30 text-discord-muted hover:text-discord-white transition-colors">
                              Не иду
                            </button>
                            <button onClick={() => handleDelete(ev.id)} className="ml-auto px-2 py-1 rounded-xl text-xs text-discord-red hover:bg-discord-red/10 transition-colors">
                              Удалить
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {past.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-discord-muted uppercase mb-2">Прошедшие</h4>
                  {past.map(ev => (
                    <div key={ev.id} className="bg-discord-dark/50 border border-discord-light/10 rounded-xl p-3 mb-2 opacity-60">
                      <h5 className="text-discord-muted font-medium text-sm line-through">{ev.title}</h5>
                      <span className="text-xs text-discord-muted">{formatDate(ev.start_time)}</span>
                    </div>
                  ))}
                </div>
              )}
              {events.length === 0 && (
                <div className="text-center py-12">
                  <Calendar size={48} className="mx-auto mb-3 text-discord-muted" />
                  <h4 className="text-discord-white font-bold mb-1">Нет событий</h4>
                  <p className="text-discord-muted text-sm">Создайте первое событие для сервера</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showCreate && <CreateEventModal onClose={() => setShowCreate(false)} onCreate={handleCreate} serverId={serverId} />}
    </div>
  );
}
