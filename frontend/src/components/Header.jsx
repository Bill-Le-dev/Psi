import { Button, Flex, Image, Link, useColorMode } from "@chakra-ui/react";
import { useRecoilValue, useSetRecoilState } from "recoil";
import userAtom from "../atoms/userAtom";
import { AiFillHome } from "react-icons/ai";
import { RxAvatar } from "react-icons/rx";
import { Link as RouterLink } from "react-router-dom";
import { FiLogOut } from "react-icons/fi";
import useLogout from "../hooks/useLogout";
import authScreenAtom from "../atoms/authAtom";
import { BsFillChatQuoteFill } from "react-icons/bs";
import { MdOutlineSettings } from "react-icons/md";

const Header = () => {
	const { colorMode, toggleColorMode } = useColorMode();
	const user = useRecoilValue(userAtom);
	const logout = useLogout();
	const setAuthScreen = useSetRecoilState(authScreenAtom);

	return (
		<Flex justifyContent={"space-between"} mt={6} mb='12'>
			{user && (
				<Link as={RouterLink} to='/'>
					<AiFillHome size={24} />
				</Link>
			)}
			{!user && (
				<Link as={RouterLink} to={"/auth"} onClick={() => setAuthScreen("login")}>
					Login
				</Link>
			)}
			<Image
				cursor={"pointer"}
				alt='logo'
				w={6}
				src={colorMode === "dark" ? "/lightlogo.svg" : "/darklogo.svg"}
				onClick={toggleColorMode}
			/>

			{user && (
				<Flex alignItems={"center"} gap={4}>
					<Link as={RouterLink} to={`/${user.username}`}>
						<RxAvatar size={24} />
					</Link>
					<Link as={RouterLink} to={`/chat`}>
						<BsFillChatQuoteFill size={20} />
					</Link>
					{user && (
						<a href="../../Prometheus.html">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 64 64"
								width="24"
								height="24"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.2"
								strokeLinecap="round"
								strokeLinejoin="round"
								>
								<rect x="8" y="8" width="48" height="32" rx="3" ry="3" fill="lightgray" stroke="black"></rect>
								
								<rect x="10" y="10" width="44" height="28" rx="2" ry="2" fill="white"></rect>
								
								<rect x="28" y="42" width="8" height="6" fill="black"></rect>
								
								<rect x="20" y="50" width="24" height="4" rx="1" ry="1" fill="black"></rect>
							</svg>
						</a>
					)}
					{user && (
						<a href="../../PsiConnect.html">
							<BsFillChatQuoteFill size={20} />
						</a>
					)}
					<Link as={RouterLink} to={`/settings`}>
						<MdOutlineSettings size={20} />
					</Link>
					<Button size={"xs"} onClick={logout}>
						<FiLogOut size={20} />
					</Button>
				</Flex>
			)}

			{!user && (
				<Link as={RouterLink} to={"/auth"} onClick={() => setAuthScreen("signup")}>
					Sign up
				</Link>
			)}
		</Flex>
	);
};

export default Header;
