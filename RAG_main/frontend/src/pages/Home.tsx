import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, type Variants } from 'framer-motion';
import { FiArrowRight } from 'react-icons/fi';
import { MdScience, MdGroups, MdWorkspacePremium, MdSecurity, MdSupportAgent, MdDevices, MdHandshake } from 'react-icons/md';

// Motion variants for animations
const fadeIn: Variants = {
	hidden: { opacity: 0, y: 20 },
	visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const cardHover: Variants = {
	hover: { scale: 1.05, transition: { type: 'spring', stiffness: 300 } },
};

// Subtle squared background + blurred patches
const BackgroundPattern = () => (
	<div className="absolute inset-0 z-0 pointer-events-none">
		{/* Grid pattern should cover the entire area */}
		<div className="absolute inset-0 opacity-6 grid grid-cols-12 h-full w-full">
			{Array.from({ length: 12 * 6 }).map((_, i) => (
				<div
					key={i}
					className="border border-accent/10"
					style={{ aspectRatio: '1 / 1', minWidth: 0 }}
				/>
			))}
		</div>

		{/* blurred color patches */}
		<div className="absolute -left-20 -top-10 w-72 h-72 bg-accent/20 rounded-full blur-3xl mix-blend-screen" />
		<div className="absolute -right-16 top-1/3 w-56 h-56 bg-black/6 rounded-full blur-2xl mix-blend-multiply" />
	</div>
);

// Add a small Feature type for clarity
type Feature = {
	icon: React.ComponentType<{ className?: string }>;
	color: string;
	title: string;
	text: string;
};

export default function Home() {
	const { isAuthenticated } = useAuth();

	// features list
	const features: Feature[] = [
		{ icon: MdScience, color: "bg-gradient-to-br from-blue-500 to-cyan-400", title: 'For Researchers', text: 'Manage projects, collaborate with peers, and mentor the next generation.' },
		{ icon: MdGroups, color: "bg-gradient-to-br from-green-500 to-teal-400", title: 'For Interns', text: 'Gain hands-on research experience and learn from experts.' },
		{ icon: MdWorkspacePremium, color: "bg-gradient-to-br from-yellow-400 to-orange-400", title: 'For Mentors', text: 'Share expertise, guide students, and contribute to academic excellence.' },
	];

	const whyChoose: Feature[] = [
		{ icon: MdHandshake, color: "text-accent", title: 'Seamless Collaboration', text: 'Connect and work together in real-time with advanced collaboration tools.' },
		{ icon: MdSecurity, color: "text-blue-500", title: 'Secure & Private', text: 'Your research data is protected with enterprise-grade security measures.' },
		{ icon: MdDevices, color: "text-teal-500", title: 'Intuitive Interface', text: 'Focus on research, not technology. Our platform is designed for ease of use.' },
		{ icon: MdSupportAgent, color: "text-yellow-500", title: '24/7 Support', text: 'Our dedicated team is always ready to help you succeed.' },
	];

	return (
		<div className="min-h-screen bg-background font-body text-text-primary">
			{/* Hero Section */}
			<motion.section
				initial="hidden"
				animate="visible"
				variants={fadeIn}
				className="relative flex flex-col items-center justify-center text-center px-6 py-32 overflow-visible -mt-16"
				style={{
					background: 'radial-gradient(circle at center, rgba(0,184,217,0.03) 0%, transparent 70%)',
				}}
			>
				<BackgroundPattern />
				<div className="relative max-w-4xl mx-auto flex flex-col items-center justify-center gap-6 px-4">
					{/* reduced boldness — responsive and wrapped */}
					<motion.h1
						className="text-2xl sm:text-3xl md:text-4xl lg:text-h1 font-heading font-semibold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent whitespace-normal"
						style={{ lineHeight: '1.15', letterSpacing: '-0.02em', marginBottom: 0 }}
					>
						Advancing Research Through Collaborative Innovation
					</motion.h1>

					{/* larger, grey paragraph with more spacing and wrapping */}
					<motion.p
						className="text-base sm:text-lg md:text-2xl text-gray-700 max-w-3xl mx-auto whitespace-normal"
						style={{ lineHeight: '1.8', marginTop: 0 }}
					>
						Connect researchers, interns, and mentors in a unified platform designed to accelerate academic discovery and knowledge sharing.
					</motion.p>

					<div className="flex flex-wrap gap-4 justify-center pt-2">
						{!isAuthenticated ? (
							<>
								<motion.div variants={cardHover} whileHover="hover">
									<Link
										to="/signup"
										className="px-8 py-3 rounded-lg font-medium text-lg text-white bg-gradient-to-r from-primary to-accent shadow-md"
									>
										Get Started
									</Link>
								</motion.div>
								<motion.div variants={cardHover} whileHover="hover">
									<Link
										to="/login"
										className="px-8 py-3 rounded-lg font-medium text-lg border-2 border-accent text-accent"
										style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(6px)' }}
									>
										Sign In
									</Link>
								</motion.div>
							</>
						) : (
							<motion.div variants={cardHover} whileHover="hover">
								<Link
									to="/dashboard"
									className="px-8 py-3 rounded-lg font-medium text-lg text-white bg-gradient-to-r from-primary to-accent shadow-md inline-flex items-center"
								>
									Go to Dashboard <FiArrowRight className="ml-2" />
								</Link>
							</motion.div>
						)}
					</div>
				</div>

				{/* Section divider */}
				<hr className="absolute bottom-0 left-0 w-full border-t border-accent/20" />
			</motion.section>

			{/* Platform Features */}
			<motion.section
				initial={{ opacity: 0 }}
				whileInView={{ opacity: 1 }}
				transition={{ duration: 0.8 }}
				viewport={{ once: true }}
				className="px-6 py-20"
			>
				<div className="max-w-6xl mx-auto">
					<h2 className="text-h2 font-heading font-semibold text-center mb-12 text-secondary flex items-center justify-center gap-3">
						<MdScience className="w-10 h-10 text-blue-500" /> Platform Features
					</h2>
					<div className="grid md:grid-cols-3 gap-8">
						{features.map((feature, i) => {
							const Icon = feature.icon;
							return (
								<motion.div
									key={i}
									initial={{ opacity: 0, y: 18 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true, amount: 0.3 }}
									transition={{ duration: 0.6, delay: i * 0.08 }}
									whileHover="hover"
									className="p-8 rounded-xl bg-white shadow-md text-center"
								>
									<div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 mx-auto ${feature.color}`}>
										<Icon className="w-12 h-12 text-white" />
									</div>
									<h3 className="text-2xl font-bold mb-3 text-secondary">{feature.title}</h3>
									<p className="text-text-primary/80">{feature.text}</p>
								</motion.div>
							);
						})}
					</div>
				</div>

				<hr className="mt-16 border-t border-accent/20" />
			</motion.section>

			{/* Why Choose Resonav */}
			<motion.section
				initial="hidden"
				whileInView="visible"
				viewport={{ once: true, amount: 0.3 }}
				variants={fadeIn}
				className="px-6 py-20"
			>
				<div className="max-w-6xl mx-auto">
					<h2 className="text-h2 font-heading font-semibold text-center mb-12 text-secondary flex items-center justify-center gap-3">
						<MdHandshake className="w-10 h-10 text-accent" /> Why Choose Resonav?
					</h2>
					<div className="grid md:grid-cols-2 gap-8">
						{whyChoose.map((item, i) => {
							const Icon = item.icon;
							return (
								<motion.div
									key={i}
									initial={{ opacity: 0, y: 18 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true, amount: 0.3 }}
									transition={{ duration: 0.6, delay: i * 0.08 }}
									whileHover="hover"
									className="p-6 rounded-lg bg-white shadow-md flex items-start gap-4"
								>
									<Icon className={`w-12 h-12 ${item.color}`} />
									<div>
										<h3 className="text-xl font-bold mb-2 text-secondary">{item.title}</h3>
										<p className="text-text-primary/80">{item.text}</p>
									</div>
								</motion.div>
							);
						})}
					</div>
				</div>

				<hr className="mt-16 border-t border-accent/20" />
			</motion.section>

			{/* Footer - improved contrast and visibility */}
			<footer className="bg-secondary text-white px-6 py-12">
				<div className="max-w-6xl mx-auto text-center">
					<h2 className="text-h2 font-heading font-semibold mb-6 flex items-center justify-center gap-3">
						<MdWorkspacePremium className="w-7 h-7 text-yellow-400" /> Start Your Research Journey Today
					</h2>
					<p className="text-paragraph max-w-3xl mx-auto leading-paragraph mb-8 opacity-90 text-white">
						Whether you're leading groundbreaking research, seeking mentorship, or looking to guide the next generation, our platform has everything you need.
					</p>
					{!isAuthenticated && (
						<div className="flex flex-wrap gap-4 justify-center pt-6">
							<motion.div variants={cardHover} whileHover="hover">
								<Link
									to="/signup"
									className="px-8 py-4 rounded-lg font-semibold text-lg bg-gradient-to-r from-blue-600 to-cyan-400 text-white"
								>
									Create Account
								</Link>
							</motion.div>
						</div>
					)}
					<div className="mt-12 border-t border-blue-200/20 pt-8">
						<p className="opacity-80 text-white">
							© {new Date().getFullYear()} Resonav. Empowering academic collaboration worldwide.
						</p>
					</div>
				</div>
			</footer>
		</div>
	);
}
