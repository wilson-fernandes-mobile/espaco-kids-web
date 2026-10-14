import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../constants/app_role.dart';
import '../../features/auth/presentation/providers/auth_providers.dart';
import '../../features/auth/presentation/screens/complete_signup_screen.dart';
import '../../features/auth/presentation/screens/gate_screens.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/signup_screen.dart';
import '../../features/calls/presentation/screens/calls_screen.dart';
import '../../features/checkin/presentation/screens/scan_screen.dart';
import '../../features/family/presentation/screens/family_home_screen.dart';
import '../../features/family/presentation/screens/care_form_screen.dart';
import '../../features/family/presentation/screens/family_notices_screen.dart';
import '../../features/family/presentation/screens/family_setup_screen.dart';
import '../../features/family/presentation/screens/family_people_screen.dart';
import '../../features/kids/presentation/screens/child_detail_screen.dart';
import '../../features/settings/presentation/screens/profile_screen.dart';
import '../../features/tenant/presentation/providers/tenant_providers.dart';
import '../../features/tenant/presentation/screens/church_select_screen.dart';
import '../../features/staff/presentation/screens/children_screen.dart';
import '../../features/staff/presentation/screens/staff_home_screen.dart';
import '../../shared/widgets/app_drawer.dart';
import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/nav_destination.dart';

const _staffTabs = [
  AppNavDestination(
    icon: Icons.home_outlined,
    selectedIcon: Icons.home,
    label: 'Início',
    path: '/inicio',
  ),
  AppNavDestination(
    icon: Icons.child_care_outlined,
    selectedIcon: Icons.child_care,
    label: 'Crianças',
    path: '/criancas',
  ),
  AppNavDestination(
    icon: Icons.qr_code_scanner_outlined,
    selectedIcon: Icons.qr_code_scanner,
    label: 'Crachá',
    path: '/ler',
  ),
  AppNavDestination(
    icon: Icons.campaign_outlined,
    selectedIcon: Icons.campaign,
    label: 'Chamadas',
    path: '/chamadas',
  ),
];

/// Só no menu lateral (não aparece na barra inferior).
const _profileDestination = AppNavDestination(
  icon: Icons.person_outline,
  selectedIcon: Icons.person,
  label: 'Perfil',
  path: '/perfil',
);

const _familyTabs = [
  AppNavDestination(
    icon: Icons.home_outlined,
    selectedIcon: Icons.home,
    label: 'Meus filhos',
    path: '/familia',
  ),
  AppNavDestination(
    icon: Icons.verified_user_outlined,
    selectedIcon: Icons.verified_user,
    label: 'Autorizados',
    path: '/autorizados',
  ),
  AppNavDestination(
    icon: Icons.notifications_none,
    selectedIcon: Icons.notifications,
    label: 'Avisos',
    path: '/avisos',
  ),
];

const _publicRoutes = ['/login', '/signup'];
const _staffOnly = ['/inicio', '/criancas', '/ler', '/chamadas', '/crianca/'];
const _familyOnly = ['/familia', '/autorizados', '/avisos', '/saude/'];

/// Reavalia o `redirect` quando a sessão muda.
class _SessionRefresh extends ChangeNotifier {
  _SessionRefresh(Ref ref) {
    ref.listen(sessionProvider, (_, _) => notifyListeners());
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = _SessionRefresh(ref);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: '/login',
    refreshListenable: refresh,
    redirect: (context, state) {
      final s = ref.read(sessionProvider);
      final loc = state.matchedLocation;
      switch (s.status) {
        case SessionStatus.loading:
          return loc == '/splash' ? null : '/splash';
        case SessionStatus.signedOut:
          return _publicRoutes.contains(loc) ? null : '/login';
        case SessionStatus.needsChurch:
          // Conta nova (ex.: Google/Apple) sem igreja: conclui o cadastro.
          final none =
              ref.read(membershipsProvider).valueOrNull?.isEmpty ?? false;
          final target = none ? '/finalizar' : '/igrejas';
          return loc == target ? null : target;
        case SessionStatus.noProfile:
        case SessionStatus.inactive:
          // Pode trocar de igreja mesmo com acesso bloqueado numa delas.
          return (loc == '/bloqueado' || loc == '/igrejas') ? null : '/bloqueado';
        case SessionStatus.ready:
          final family = s.user!.isFamily;
          final home = family ? '/familia' : '/inicio';
          // Entrou pelo código da igreja e ainda não cadastrou a família.
          if (s.user!.role == AppRole.responsavel && !s.user!.hasFamily) {
            return loc == '/cadastro-familia' ? null : '/cadastro-familia';
          }
          if (loc == '/cadastro-familia') return null;
          final onGate =
              _publicRoutes.contains(loc) ||
              loc == '/splash' ||
              loc == '/bloqueado';
          if (onGate) return home;
          // Cada papel só acessa as suas rotas.
          final blocked = family ? _staffOnly : _familyOnly;
          if (blocked.any(loc.startsWith)) return home;
          return null;
      }
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, _) => const SplashScreen()),
      GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
      GoRoute(path: '/signup', builder: (_, _) => const SignupScreen()),
      GoRoute(
        path: '/finalizar',
        builder: (_, _) => const CompleteSignupScreen(),
      ),
      GoRoute(
        path: '/saude/:id',
        builder: (_, st) => CareFormScreen(childId: st.pathParameters['id']!),
      ),
      GoRoute(
        path: '/cadastro-familia',
        builder: (_, _) => const FamilySetupScreen(),
      ),
      GoRoute(
        path: '/igrejas',
        builder: (_, _) => const ChurchSelectScreen(),
      ),
      GoRoute(
        path: '/bloqueado',
        builder:
            (_, _) => Consumer(
              builder:
                  (_, ref, _) => BlockedScreen(
                    inactive:
                        ref.watch(sessionProvider).status ==
                        SessionStatus.inactive,
                  ),
            ),
      ),
      GoRoute(
        path: '/crianca/:id',
        builder:
            (_, st) => ChildDetailScreen(childId: st.pathParameters['id']!),
      ),
      ShellRoute(
        builder:
            (context, state, child) =>
                _RoleShell(location: state.uri.path, child: child),
        routes: [
          GoRoute(path: '/inicio', builder: (_, _) => const StaffHomeScreen()),
          GoRoute(path: '/criancas', builder: (_, _) => const ChildrenScreen()),
          GoRoute(path: '/ler', builder: (_, _) => const ScanScreen()),
          GoRoute(path: '/chamadas', builder: (_, _) => const CallsScreen()),
          GoRoute(
            path: '/familia',
            builder: (_, _) => const FamilyHomeScreen(),
          ),
          GoRoute(
            path: '/autorizados',
            builder: (_, _) => const FamilyPeopleScreen(),
          ),
          GoRoute(
            path: '/avisos',
            builder: (_, _) => const FamilyNoticesScreen(),
          ),
          GoRoute(path: '/perfil', builder: (_, _) => const ProfileScreen()),
        ],
      ),
    ],
  );
});

/// Navegação inferior (mobile) / lateral (tablet) conforme o papel.
class _RoleShell extends ConsumerWidget {
  const _RoleShell({required this.location, required this.child});

  final String location;
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(sessionProvider).user;
    final tabs = (user?.isFamily ?? false) ? _familyTabs : _staffTabs;
    final i = tabs.indexWhere((t) => location.startsWith(t.path));
    return AppScaffold(
      drawer: AppDrawer(destinations: [...tabs, _profileDestination]),
      destinations: tabs,
      currentIndex: i < 0 ? 0 : i,
      onDestinationSelected: (n) => context.go(tabs[n].path),
      child: child,
    );
  }
}
