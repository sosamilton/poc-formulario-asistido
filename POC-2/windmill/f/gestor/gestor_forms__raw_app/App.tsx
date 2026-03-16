import React, { useState, useEffect } from 'react'
import { SurveyCreatorComponent, SurveyCreator } from 'survey-creator-react'
import 'survey-core/defaultV2.min.css'
import 'survey-creator-core/survey-creator-core.min.css'
import './index.css'

type Form = {
    id: string
    slug: string
    name: string
    description: string | null
    category: string | null
    is_public: boolean
    active_version: number
    created_at: string
    updated_at: string
}

type View = 'list' | 'create' | 'edit'

const App = () => {
    const [currentView, setCurrentView] = useState<View>('list')
    const [forms, setForms] = useState<Form[]>([])
    const [selectedForm, setSelectedForm] = useState<Form | null>(null)
    const [creator, setCreator] = useState<SurveyCreator | null>(null)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)
    const [showModal, setShowModal] = useState(false)
    const [formData, setFormData] = useState({ slug: '', name: '', description: '' })

    const creatorOptions = {
        showLogicTab: true,
        showTranslationTab: true,
        isAutoSave: false
    }

    async function callScript(path: string, params: any = {}) {
        console.log('🔍 === DEBUG API CALL ===')
        console.log('🔍 Script path:', path)
        console.log('🔍 Params:', JSON.stringify(params, null, 2))

        try {
            const base = (window as any).WMILL_URL || window.location.origin
            const apiBase = `${base}/api`
            const detectedWorkspace =
                (window as any).WMILL_WORKSPACE ||
                (() => {
                    try {
                        const m = window.location.pathname.match(/\/(?:apps|w)\/(\w+)/)
                        return m?.[1]
                    } catch {
                        return undefined
                    }
                })() ||
                'formularios'

            const url = `${apiBase}/w/${detectedWorkspace}/jobs/run_wait_result/p/${path}`
            console.log('🔍 Full URL:', url)

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(params)
            })

            console.log('🔍 Response status:', response.status)

            if (!response.ok) {
                const errorText = await response.text()
                console.log('❌ Error response:', errorText)
                throw new Error(`API Error ${response.status}: ${errorText}`)
            }

            const ct = response.headers.get('content-type') || ''
            if (!ct.includes('application/json')) {
                const text = await response.text()
                throw new Error(`Respuesta no JSON (posible login o proxy): ${text.slice(0, 200)}`)
            }
            const result = await response.json()
            console.log('✅ Response data:', result)
            return result
        } catch (error) {
            console.log('❌ API ERROR:', error)
            throw error
        }
    }

    function showMessage(text: string, type: 'error' | 'success' = 'error') {
        setMessage({ text, type })
        setTimeout(() => setMessage(null), 5000)
    }

    async function loadForms() {
        setLoading(true)
        try {
            const data = await callScript('f/forms/list_forms')
            setForms(data || [])
        } catch (err: any) {
            showMessage('Error al cargar formularios: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    async function createForm() {
        if (!creator) return
        
        setLoading(true)
        try {
            const schema = creator.JSON
            
            await callScript('f/forms/create_form', {
                slug: formData.slug,
                name: formData.name,
                description: formData.description,
                schema_json: schema,
                config: {},
                is_public: true
            })

            showMessage('Formulario creado exitosamente', 'success')
            setCurrentView('list')
            setShowModal(false)
            setFormData({ slug: '', name: '', description: '' })
            await loadForms()
        } catch (err: any) {
            showMessage('Error al crear formulario: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    async function updateForm() {
        if (!creator || !selectedForm) return
        
        setLoading(true)
        try {
            const schema = creator.JSON

            await callScript('f/forms/update_form', {
                slug: selectedForm.slug,
                name: formData.name,
                description: formData.description,
                schema_json: schema
            })

            showMessage('Formulario actualizado exitosamente', 'success')
            setCurrentView('list')
            setShowModal(false)
            setFormData({ slug: '', name: '', description: '' })
            await loadForms()
        } catch (err: any) {
            showMessage('Error al actualizar formulario: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    async function deleteForm(slug: string) {
        if (!confirm(`¿Está seguro de eliminar el formulario "${slug}"?`)) return
        
        setLoading(true)
        try {
            await callScript('f/forms/delete_form', { slug, hard_delete: false })
            showMessage('Formulario eliminado exitosamente', 'success')
            await loadForms()
        } catch (err: any) {
            showMessage('Error al eliminar formulario: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    function startCreate() {
        const newCreator = new SurveyCreator(creatorOptions)
        setCreator(newCreator)
        setCurrentView('create')
        setSelectedForm(null)
    }

    async function startEdit(form: Form) {
        setLoading(true)
        try {
            const runtime = await callScript('f/forms/get_runtime', { slug: form.slug })
            const newCreator = new SurveyCreator(creatorOptions)
            newCreator.JSON = runtime.schema
            setCreator(newCreator)
            setSelectedForm(form)
            setFormData({
                slug: form.slug,
                name: form.name,
                description: form.description || ''
            })
            setCurrentView('edit')
        } catch (err: any) {
            showMessage('Error al cargar formulario: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    function cancelEdit() {
        setCreator(null)
        setSelectedForm(null)
        setFormData({ slug: '', name: '', description: '' })
        setCurrentView('list')
    }

    function openSaveModal() {
        if (currentView === 'edit' && selectedForm) {
            setFormData({
                slug: selectedForm.slug,
                name: selectedForm.name,
                description: selectedForm.description || ''
            })
        }
        setShowModal(true)
    }

    function handleSave() {
        if (!formData.slug || !formData.name) {
            alert('Slug y Nombre son obligatorios')
            return
        }
        
        if (currentView === 'edit') {
            updateForm()
        } else {
            createForm()
        }
    }

    useEffect(() => {
        loadForms()
    }, [])

    return (
        <div className="container">
            <div className="header">
                <h1>Gestor de Formularios</h1>
                <div>
                    {currentView === 'list' ? (
                        <button onClick={startCreate} className="btn btn-primary">
                            + Crear Formulario
                        </button>
                    ) : (
                        <button onClick={cancelEdit} className="btn btn-secondary">
                            ← Volver a la lista
                        </button>
                    )}
                </div>
            </div>

            {message && (
                <div className={`message message-${message.type}`}>
                    {message.text}
                </div>
            )}

            {currentView === 'list' && (
                <div>
                    {loading ? (
                        <div className="loading">Cargando formularios...</div>
                    ) : forms.length === 0 ? (
                        <div className="empty-state">
                            <p>No hay formularios creados</p>
                            <button onClick={startCreate} className="btn btn-primary">
                                Crear primer formulario
                            </button>
                        </div>
                    ) : (
                        <table className="forms-table">
                            <thead>
                                <tr>
                                    <th>Slug</th>
                                    <th>Nombre</th>
                                    <th>Descripción</th>
                                    <th>Versión</th>
                                    <th>Público</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {forms.map(form => (
                                    <tr key={form.id}>
                                        <td><code>{form.slug}</code></td>
                                        <td>{form.name}</td>
                                        <td>{form.description || '-'}</td>
                                        <td>{form.active_version}</td>
                                        <td>{form.is_public ? '✓' : '✗'}</td>
                                        <td>
                                            <button onClick={() => startEdit(form)} className="btn btn-edit">
                                                Editar
                                            </button>
                                            <button onClick={() => deleteForm(form.slug)} className="btn btn-delete">
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {(currentView === 'create' || currentView === 'edit') && (
                <div className="creator-container">
                    <div className="creator-header">
                        <h2>{currentView === 'edit' ? `Editar: ${selectedForm?.name}` : 'Crear Nuevo Formulario'}</h2>
                        <button onClick={openSaveModal} className="btn btn-primary" disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar Formulario'}
                        </button>
                    </div>
                    <div className="creator-wrapper">
                        {creator && <SurveyCreatorComponent creator={creator} />}
                    </div>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Datos del Formulario</h3>
                        <div className="form-group">
                            <label>Slug (identificador único)*</label>
                            <input
                                type="text"
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                disabled={currentView === 'edit'}
                                placeholder="ej: ddjj-iibb"
                            />
                        </div>
                        <div className="form-group">
                            <label>Nombre*</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="ej: Declaración Jurada IIBB"
                            />
                        </div>
                        <div className="form-group">
                            <label>Descripción</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Descripción opcional"
                            />
                        </div>
                        <div className="modal-actions">
                            <button onClick={() => setShowModal(false)} className="btn btn-secondary">
                                Cancelar
                            </button>
                            <button onClick={handleSave} className="btn btn-primary">
                                {currentView === 'edit' ? 'Actualizar' : 'Crear'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default App;
