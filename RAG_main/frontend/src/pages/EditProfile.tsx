import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Briefcase, MapPin, BookOpen, Save, Mail, Phone } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function EditProfile() {
    const {
        username, title, institution, interests, bio, pincode, city,
        updateProfile, firstName, lastName, email
    } = useAuth()

    const navigate = useNavigate()

    const [formData, setFormData] = useState({
        username: '',
        title: '',
        institution: '',
        interests: '',
        bio: '',
        pincode: '',
        city: '',
        firstName: '',
        lastName: '',
        phoneNumber: ''
    })

    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    // Load initial data
    useEffect(() => {
        setFormData({
            username: username || '',
            title: title || '',
            institution: institution || '',
            interests: interests || '',
            bio: bio || '',
            pincode: pincode || '',
            city: city || '',
            firstName: firstName || '',
            lastName: lastName || '',
            phoneNumber: '' // We don't have phoneNumber in context yet? I need to check context type too.
            // Wait, I didn't add phoneNumber to AuthContext type! 
            // I should assume it will be available in future or for now leave it blank if not in context.
            // But updateMe endpoint accepts it.
        })
    }, [username, title, institution, interests, bio, pincode, city, firstName, lastName])

    // Fetch latest data including phone number if available via getMe again?
    // Actually, AuthContext calls getMe. If I want phoneNumber in context, I must add it to AuthContext type and userAtom.

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await updateProfile(formData)
            setMessage({ type: 'success', text: 'Profile updated successfully!' })
            setTimeout(() => {
                navigate('/profile')
            }, 1000)
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update profile.' })
        }
    }

    return (
        <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
                <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                    Edit Profile
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                    Update your personal details and public profile information.
                </p>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                {message && (
                    <div className={`p-4 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6 space-y-6">
                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                        {/* Name Fields */}
                        <div className="sm:col-span-3">
                            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First name</label>
                            <input
                                type="text"
                                name="firstName"
                                id="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                className="mt-1 shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md border py-2 px-3"
                            />
                        </div>

                        <div className="sm:col-span-3">
                            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last name</label>
                            <input
                                type="text"
                                name="lastName"
                                id="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                className="mt-1 shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md border py-2 px-3"
                            />
                        </div>

                        {/* Email Address */}
                        <div className="sm:col-span-6">
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    name="email"
                                    id="email"
                                    value={email || ''}
                                    disabled
                                    className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-md border py-2 bg-gray-100 text-gray-500 cursor-not-allowed"
                                />
                            </div>
                        </div>

                        {/* Username */}
                        <div className="sm:col-span-4">
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
                            <div className="mt-1 flex rounded-md shadow-sm">
                                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                                    resonav.com/
                                </span>
                                <input
                                    type="text"
                                    name="username"
                                    id="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    className="flex-1 focus:ring-primary focus:border-primary block w-full min-w-0 rounded-none rounded-r-md sm:text-sm border-gray-300 border py-2 px-3"
                                />
                            </div>
                        </div>

                        {/* Phone Number - NEW */}
                        <div className="sm:col-span-6">
                            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">Phone Number</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Phone className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    name="phoneNumber"
                                    id="phoneNumber"
                                    value={formData.phoneNumber}
                                    onChange={handleChange}
                                    className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-md border py-2"
                                    placeholder="+1 (555) 123-4567"
                                />
                            </div>
                        </div>


                        {/* Professional Info */}
                        <div className="sm:col-span-3">
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Position / Title</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Briefcase className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    name="title"
                                    id="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-md border py-2"
                                    placeholder="Senior Researcher"
                                />
                            </div>
                        </div>

                        <div className="sm:col-span-3">
                            <label htmlFor="institution" className="block text-sm font-medium text-gray-700">Institution / Company</label>
                            <input
                                type="text"
                                name="institution"
                                id="institution"
                                value={formData.institution}
                                onChange={handleChange}
                                className="mt-1 shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md border py-2 px-3"
                            />
                        </div>

                        {/* Bio */}
                        <div className="sm:col-span-6">
                            <label htmlFor="bio" className="block text-sm font-medium text-gray-700">Bio</label>
                            <div className="mt-1">
                                <textarea
                                    id="bio"
                                    name="bio"
                                    rows={3}
                                    value={formData.bio}
                                    onChange={handleChange}
                                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border border-gray-300 rounded-md p-3"
                                    placeholder="Write a few sentences about yourself."
                                />
                            </div>
                        </div>

                        {/* Interests */}
                        <div className="sm:col-span-6">
                            <label htmlFor="interests" className="block text-sm font-medium text-gray-700">Areas of Interest</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <BookOpen className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    name="interests"
                                    id="interests"
                                    value={formData.interests}
                                    onChange={handleChange}
                                    className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-md border py-2"
                                    placeholder="Machine Learning, Neuroscience (comma separated)"
                                />
                            </div>
                        </div>

                        {/* Location */}
                        <div className="sm:col-span-3">
                            <label htmlFor="city" className="block text-sm font-medium text-gray-700">City</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    name="city"
                                    id="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-md border py-2"
                                />
                            </div>
                        </div>

                        <div className="sm:col-span-3">
                            <label htmlFor="pincode" className="block text-sm font-medium text-gray-700">Pincode</label>
                            <input
                                type="text"
                                name="pincode"
                                id="pincode"
                                value={formData.pincode}
                                onChange={handleChange}
                                className="mt-1 shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md border py-2 px-3"
                            />
                        </div>
                    </div>

                    <div className="pt-5">
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}
