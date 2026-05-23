import { useState } from 'react'

import { useAuth } from '../context/AuthContext'
import { User, Briefcase, MapPin, BookOpen } from 'lucide-react'

type Props = {
    isOpen: boolean
    onClose: () => void
}

export default function CompleteProfileModal({ isOpen, onClose }: Props) {

    const { updateProfile } = useAuth()
    const [formData, setFormData] = useState({
        username: '',
        professionalRole: 'Researcher',
        title: '',
        institution: '',
        interests: '',
        bio: '',
        pincode: '',
        city: ''
    })

    if (!isOpen) return null

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        updateProfile(formData)
        onClose()
    }

    const handleSkip = () => {
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 relative animate-in fade-in zoom-in duration-200 my-8">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">Complete Your Profile</h2>
                    <p className="text-gray-500 mt-2">Tell us a bit more about yourself to get the best experience.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Username */}
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User size={16} className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm py-2 border"
                                    placeholder="johndoe"
                                />
                            </div>
                        </div>

                        {/* Role */}
                        <div>
                            <label htmlFor="professionalRole" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                            <select
                                id="professionalRole"
                                name="professionalRole"
                                value={formData.professionalRole}
                                onChange={handleChange}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm py-2 border px-3"
                            >
                                <option value="Researcher">Researcher</option>
                                <option value="Student">Student</option>
                                <option value="Mentor">Mentor</option>
                            </select>
                        </div>

                        {/* Position Title */}
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Position Title</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Briefcase size={16} className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    id="title"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm py-2 border"
                                    placeholder="Senior Researcher"
                                />
                            </div>
                        </div>

                        {/* Institution */}
                        <div>
                            <label htmlFor="institution" className="block text-sm font-medium text-gray-700 mb-1">Institution / Company</label>
                            <input
                                type="text"
                                id="institution"
                                name="institution"
                                value={formData.institution}
                                onChange={handleChange}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm py-2 border px-3"
                                placeholder="University of Science"
                            />
                        </div>
                    </div>

                    {/* Areas of Interest */}
                    <div>
                        <label htmlFor="interests" className="block text-sm font-medium text-gray-700 mb-1">Areas of Interest</label>
                        <div className="relative">
                            <div className="absolute top-3 left-3 pointer-events-none">
                                <BookOpen size={16} className="text-gray-400" />
                            </div>
                            <textarea
                                id="interests"
                                name="interests"
                                value={formData.interests}
                                onChange={handleChange}
                                rows={2}
                                className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm py-2 border"
                                placeholder="Machine Learning, Neuroscience, Data Analysis..."
                            />
                        </div>
                    </div>

                    {/* Bio */}
                    <div>
                        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                        <textarea
                            id="bio"
                            name="bio"
                            value={formData.bio}
                            onChange={handleChange}
                            rows={3}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm py-2 border px-3"
                            placeholder="Tell us a little about yourself..."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Pincode */}
                        <div>
                            <label htmlFor="pincode" className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MapPin size={16} className="text-gray-400" />
                                </div>
                                <input
                                    type="number"
                                    id="pincode"
                                    name="pincode"
                                    value={formData.pincode}
                                    onChange={handleChange}
                                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm py-2 border"
                                    placeholder="123456"
                                />
                            </div>
                        </div>

                        {/* City */}
                        <div>
                            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">City</label>
                            <input
                                type="text"
                                id="city"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm py-2 border px-3"
                                placeholder="New York"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-gray-100 mt-6">
                        <button
                            type="button"
                            onClick={handleSkip}
                            className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                        >
                            Skip, do it later
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-2.5 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium transition-colors"
                        >
                            Save Profile
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
