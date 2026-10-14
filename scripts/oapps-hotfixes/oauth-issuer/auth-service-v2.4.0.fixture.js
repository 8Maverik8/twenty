"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AuthService", {
    enumerable: true,
    get: function() {
        return AuthService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _nodecrypto = /*#__PURE__*/ _interop_require_wildcard(require("node:crypto"));
const _render = require("@react-email/render");
const _datefns = require("date-fns");
const _ms = /*#__PURE__*/ _interop_require_default(require("ms"));
const _twentyemails = require("twenty-emails");
const _constants = require("twenty-shared/constants");
const _types = require("twenty-shared/types");
const _utils = require("twenty-shared/utils");
const _typeorm1 = require("typeorm");
const _apptokenentity = require("../../app-token/app-token.entity");
const _applicationregistrationservice = require("../../application/application-registration/application-registration.service");
const _auditservice = require("../../audit/services/audit.service");
const _authexception = require("../auth.exception");
const _authutil = require("../auth.util");
const _authssoservice = require("./auth-sso.service");
const _createssoconnectedaccountservice = require("./create-sso-connected-account.service");
const _signinupservice = require("./sign-in-up.service");
const _accesstokenservice = require("../token/services/access-token.service");
const _logintokenservice = require("../token/services/login-token.service");
const _refreshtokenservice = require("../token/services/refresh-token.service");
const _workspaceagnostictokenservice = require("../token/services/workspace-agnostic-token.service");
const _authcontexttype = require("../types/auth-context.type");
const _validateredirecturiutil = require("../utils/validate-redirect-uri.util");
const _domainserverconfigservice = require("../../domain/domain-server-config/services/domain-server-config.service");
const _workspacedomainsservice = require("../../domain/workspace-domains/services/workspace-domains.service");
const _emailservice = require("../../email/email.service");
const _featureflagservice = require("../../feature-flag/services/feature-flag.service");
const _guardredirectservice = require("../../guard-redirect/services/guard-redirect.service");
const _i18nservice = require("../../i18n/i18n.service");
const _twentyconfigservice = require("../../twenty-config/twenty-config.service");
const _userworkspaceservice = require("../../user-workspace/user-workspace.service");
const _userservice = require("../../user/services/user.service");
const _userentity = require("../../user/user.entity");
const _workspaceinvitationservice = require("../../workspace-invitation/services/workspace-invitation.service");
const _workspacetype = require("../../workspace/types/workspace.type");
const _workspaceentity = require("../../workspace/workspace.entity");
const _workspacevalidate = require("../../workspace/workspace.validate");
const _permissionsservice = require("../../../metadata-modules/permissions/permissions.service");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
let AuthService = class AuthService {
    async checkAccessAndUseInvitationOrThrow(workspace, user) {
        if (await this.userWorkspaceService.checkUserWorkspaceExists(user.id, workspace.id)) {
            return;
        }
        const invitation = await this.workspaceInvitationService.getOneWorkspaceInvitation(workspace.id, user.email);
        if (invitation) {
            await this.workspaceInvitationService.validatePersonalInvitation({
                workspacePersonalInviteToken: invitation.value,
                email: user.email
            });
            await this.userWorkspaceService.addUserToWorkspaceIfUserNotInWorkspace(user, workspace, invitation.context?.roleId);
            return;
        }
        throw new _authexception.AuthException('User is not a member of the workspace.', _authexception.AuthExceptionCode.FORBIDDEN_EXCEPTION, {
            userFriendlyMessage: /*i18n*/ {
                id: "pMOjQa",
                message: "User is not a member of the workspace."
            }
        });
    }
    async validateLoginWithPassword(input, targetWorkspace) {
        const user = await this.userRepository.findOne({
            where: {
                email: input.email
            },
            relations: {
                userWorkspaces: true
            }
        });
        if (!user) {
            throw new _authexception.AuthException('User not found', _authexception.AuthExceptionCode.USER_NOT_FOUND);
        }
        if (targetWorkspace && !targetWorkspace.isPasswordAuthEnabled) {
            const canBypass = await this.canUserBypassAuthProvider({
                user,
                workspace: targetWorkspace,
                provider: _workspacetype.AuthProviderEnum.Password
            });
            if (!canBypass) {
                throw new _authexception.AuthException('Email/Password auth is not enabled for this workspace', _authexception.AuthExceptionCode.FORBIDDEN_EXCEPTION);
            }
        }
        if (targetWorkspace) {
            await this.checkAccessAndUseInvitationOrThrow(targetWorkspace, user);
        }
        if (!user.passwordHash) {
            throw new _authexception.AuthException('Incorrect login method', _authexception.AuthExceptionCode.INVALID_INPUT, {
                userFriendlyMessage: /*i18n*/ {
                    id: "VkcC68",
                    message: "User was not created with email/password"
                }
            });
        }
        const isValid = await (0, _authutil.compareHash)(input.password, user.passwordHash);
        if (!isValid) {
            throw new _authexception.AuthException('Wrong password', _authexception.AuthExceptionCode.FORBIDDEN_EXCEPTION, {
                userFriendlyMessage: /*i18n*/ {
                    id: "RksBK0",
                    message: "Wrong password."
                }
            });
        }
        await this.checkIsEmailVerified(user.isEmailVerified);
        return user;
    }
    async checkIsEmailVerified(isEmailVerified) {
        const isEmailVerificationRequired = this.twentyConfigService.get('IS_EMAIL_VERIFICATION_REQUIRED');
        if (isEmailVerificationRequired && !isEmailVerified) {
            throw new _authexception.AuthException('Email is not verified', _authexception.AuthExceptionCode.EMAIL_NOT_VERIFIED);
        }
    }
    async validatePassword(userData, authParams) {
        if (userData.type === 'newUser') {
            userData.newUserPayload.passwordHash = await this.signInUpService.generateHash(authParams.password);
        }
        if (userData.type === 'existingUser') {
            if (!userData.existingUser.passwordHash) {
                throw new _authexception.AuthException('Incorrect login method', _authexception.AuthExceptionCode.INVALID_INPUT, {
                    userFriendlyMessage: /*i18n*/ {
                        id: "VkcC68",
                        message: "User was not created with email/password"
                    }
                });
            }
            await this.signInUpService.validatePassword({
                password: authParams.password,
                passwordHash: userData.existingUser.passwordHash
            });
        }
    }
    async isAuthProviderEnabledOrThrow(userData, authParams, workspace) {
        if (authParams.provider === _workspacetype.AuthProviderEnum.Password) {
            await this.validatePassword(userData, authParams);
        }
        if ((0, _utils.isDefined)(workspace)) {
            const isProviderEnabled = _workspacevalidate.workspaceValidator.isAuthEnabled(authParams.provider, workspace);
            if (isProviderEnabled) {
                return;
            }
            const existingUser = userData.type === 'existingUser' ? userData.existingUser : undefined;
            if (existingUser && await this.canUserBypassAuthProvider({
                user: existingUser,
                workspace,
                provider: authParams.provider
            })) {
                return;
            }
            _workspacevalidate.workspaceValidator.isAuthEnabledOrThrow(authParams.provider, workspace);
        }
    }
    async canUserBypassAuthProvider({ user, workspace, provider }) {
        const bypassEnabled = (()=>{
            switch(provider){
                case _workspacetype.AuthProviderEnum.Password:
                    return workspace.isPasswordAuthBypassEnabled;
                case _workspacetype.AuthProviderEnum.Google:
                    return workspace.isGoogleAuthBypassEnabled;
                case _workspacetype.AuthProviderEnum.Microsoft:
                    return workspace.isMicrosoftAuthBypassEnabled;
                default:
                    return false;
            }
        })();
        if (!bypassEnabled) {
            return false;
        }
        const userWorkspace = user.userWorkspaces?.find((userWorkspace)=>userWorkspace.workspaceId === workspace.id);
        if (!userWorkspace) {
            return false;
        }
        return await this.permissionsService.userHasWorkspaceSettingPermission({
            userWorkspaceId: userWorkspace.id,
            workspaceId: workspace.id,
            setting: _constants.PermissionFlagType.SSO_BYPASS
        });
    }
    async signInUp(params) {
        await this.isAuthProviderEnabledOrThrow(params.userData, params.authParams, params.workspace);
        if (params.userData.type === 'newUser') {
            const partialUserWithPicture = await this.signInUpService.computePartialUserFromUserPayload(params.userData.newUserPayload, params.authParams);
            return await this.signInUpService.signInUp({
                ...params,
                userData: {
                    type: 'newUserWithPicture',
                    newUserWithPicture: partialUserWithPicture
                }
            });
        }
        return await this.signInUpService.signInUp({
            ...params,
            userData: {
                type: 'existingUser',
                existingUser: params.userData.existingUser
            }
        });
    }
    async verify(email, workspaceId, authProvider) {
        if (!email) {
            throw new _authexception.AuthException('Email is required', _authexception.AuthExceptionCode.INVALID_INPUT, {
                userFriendlyMessage: /*i18n*/ {
                    id: "Qof3ks",
                    message: "Email is required."
                }
            });
        }
        const user = await this.userService.findUserByEmail(email);
        (0, _utils.assertIsDefinedOrThrow)(user, new _authexception.AuthException('User not found', _authexception.AuthExceptionCode.USER_NOT_FOUND));
        // passwordHash is hidden for security reasons
        user.passwordHash = '';
        const accessToken = await this.accessTokenService.generateAccessToken({
            userId: user.id,
            workspaceId,
            authProvider
        });
        const refreshToken = await this.refreshTokenService.generateRefreshToken({
            userId: user.id,
            workspaceId,
            authProvider,
            targetedTokenType: _authcontexttype.JwtTokenTypeEnum.ACCESS
        });
        return {
            tokens: {
                accessOrWorkspaceAgnosticToken: accessToken,
                refreshToken
            }
        };
    }
    async generateImpersonationAccessTokenAndRefreshToken({ workspaceId, impersonatorUserWorkspaceId, impersonatedUserWorkspaceId, _impersonatorUserId, impersonatedUserId }) {
        const correlationId = (0, _nodecrypto.randomUUID)();
        const analytics = this.auditService.createContext({
            workspaceId,
            userId: _impersonatorUserId
        });
        analytics.insertWorkspaceEvent('Monitoring', {
            eventName: 'workspace.impersonation.attempted',
            message: `correlationId=${correlationId}; impersonatorUserWorkspaceId=${impersonatorUserWorkspaceId}; targetUserWorkspaceId=${impersonatedUserWorkspaceId}; workspaceId=${workspaceId}`
        });
        const accessToken = await this.accessTokenService.generateAccessToken({
            userId: impersonatedUserId,
            workspaceId,
            authProvider: _workspacetype.AuthProviderEnum.Impersonation,
            isImpersonating: true,
            impersonatorUserWorkspaceId,
            impersonatedUserWorkspaceId
        });
        const refreshToken = await this.refreshTokenService.generateRefreshToken({
            userId: impersonatedUserId,
            workspaceId,
            authProvider: _workspacetype.AuthProviderEnum.Impersonation,
            targetedTokenType: _authcontexttype.JwtTokenTypeEnum.ACCESS,
            isImpersonating: true,
            impersonatorUserWorkspaceId,
            impersonatedUserWorkspaceId
        }, true);
        analytics.insertWorkspaceEvent('Monitoring', {
            eventName: 'workspace.impersonation.issued',
            message: `correlationId=${correlationId}; impersonatorUserWorkspaceId=${impersonatorUserWorkspaceId}; targetUserWorkspaceId=${impersonatedUserWorkspaceId}; workspaceId=${workspaceId}`
        });
        return {
            tokens: {
                accessOrWorkspaceAgnosticToken: accessToken,
                refreshToken
            }
        };
    }
    async countAvailableWorkspacesByEmail(email) {
        return Object.values(await this.userWorkspaceService.findAvailableWorkspacesByEmail(email)).flat(2).length;
    }
    async checkUserExists(email) {
        const user = await this.userService.findUserByEmail(email);
        const isUserExist = (0, _utils.isDefined)(user);
        return {
            exists: isUserExist,
            availableWorkspacesCount: await this.countAvailableWorkspacesByEmail(email),
            isEmailVerified: isUserExist ? user.isEmailVerified : false
        };
    }
    async checkWorkspaceInviteHashIsValid(inviteHash) {
        const workspace = await this.workspaceRepository.findOneBy({
            inviteHash
        });
        return {
            isValid: !!workspace
        };
    }
    async generateAuthorizationCode(authorizeAppInput, user, workspace) {
        const { clientId, codeChallenge } = authorizeAppInput;
        const applicationRegistration = await this.applicationRegistrationService.findOneByClientId(clientId);
        if (!applicationRegistration) {
            throw new _authexception.AuthException(`Client not found for '${clientId}'`, _authexception.AuthExceptionCode.CLIENT_NOT_FOUND);
        }
        if (!authorizeAppInput.redirectUrl) {
            throw new _authexception.AuthException(`redirectUrl not provided for '${clientId}'`, _authexception.AuthExceptionCode.FORBIDDEN_EXCEPTION);
        }
        // OAuth 2.1 / MCP auth spec: PKCE is mandatory for public clients
        // (clients registered with token_endpoint_auth_method=none, i.e. no
        // client secret hash). Confidential clients are authenticated at the
        // token endpoint instead.
        const isPublicClient = !applicationRegistration.oAuthClientSecretHash;
        if (isPublicClient && !codeChallenge) {
            throw new _authexception.AuthException(`code_challenge is required for public clients (PKCE S256, per OAuth 2.1)`, _authexception.AuthExceptionCode.FORBIDDEN_EXCEPTION);
        }
        // RFC 8252 §7.3: Native apps using loopback redirect URIs may use any port.
        // When a registration has no explicit redirect URIs (e.g. the seeded CLI registration),
        // allow any loopback redirect URI.
        const hasRegisteredRedirectUris = applicationRegistration.oAuthRedirectUris.length > 0;
        if (hasRegisteredRedirectUris) {
            if (!applicationRegistration.oAuthRedirectUris.includes(authorizeAppInput.redirectUrl)) {
                throw new _authexception.AuthException(`redirectUrl mismatch for '${clientId}'`, _authexception.AuthExceptionCode.FORBIDDEN_EXCEPTION);
            }
        } else {
            let redirectUrl;
            try {
                redirectUrl = new URL(authorizeAppInput.redirectUrl);
            } catch  {
                throw new _authexception.AuthException(`Invalid redirectUrl for '${clientId}'`, _authexception.AuthExceptionCode.FORBIDDEN_EXCEPTION);
            }
            const isLoopback = redirectUrl.hostname === 'localhost' || redirectUrl.hostname === '127.0.0.1';
            if (!isLoopback) {
                throw new _authexception.AuthException(`redirectUrl mismatch for '${clientId}'`, _authexception.AuthExceptionCode.FORBIDDEN_EXCEPTION);
            }
        }
        // Validate requested scopes are a subset of the registration's allowed scopes
        const parsedScopes = authorizeAppInput.scope ? authorizeAppInput.scope.split(' ').filter(Boolean) : [];
        const requestedScopes = parsedScopes.length > 0 ? parsedScopes : applicationRegistration.oAuthScopes;
        const invalidScopes = requestedScopes.filter((scope)=>!applicationRegistration.oAuthScopes.includes(scope));
        if (invalidScopes.length > 0) {
            throw new _authexception.AuthException(`Invalid scopes: ${invalidScopes.join(', ')}`, _authexception.AuthExceptionCode.FORBIDDEN_EXCEPTION);
        }
        const redirectUriValidation = (0, _validateredirecturiutil.validateRedirectUri)(authorizeAppInput.redirectUrl);
        if (!redirectUriValidation.valid) {
            throw new _authexception.AuthException(redirectUriValidation.reason, _authexception.AuthExceptionCode.FORBIDDEN_EXCEPTION);
        }
        const authorizationCode = _nodecrypto.default.randomBytes(42).toString('hex');
        const hashedAuthorizationCode = _nodecrypto.default.createHash('sha256').update(authorizationCode).digest('hex');
        const expiresAt = (0, _datefns.addMilliseconds)(new Date().getTime(), (0, _ms.default)('5m'));
        const authCodeContext = {
            redirectUri: authorizeAppInput.redirectUrl,
            clientId: applicationRegistration.oAuthClientId,
            scope: requestedScopes.join(' '),
            ...codeChallenge ? {
                codeChallenge
            } : {}
        };
        const token = this.appTokenRepository.create({
            value: hashedAuthorizationCode,
            type: _apptokenentity.AppTokenType.AuthorizationCode,
            userId: user.id,
            workspaceId: workspace.id,
            expiresAt,
            context: authCodeContext
        });
        await this.appTokenRepository.save(token);
        redirectUriValidation.parsed.searchParams.set('code', authorizationCode);
        if (authorizeAppInput.state) {
            redirectUriValidation.parsed.searchParams.set('state', authorizeAppInput.state);
        }
        return {
            redirectUrl: redirectUriValidation.parsed.toString()
        };
    }
    async updatePassword(userId, newPassword) {
        if (!userId) {
            throw new _authexception.AuthException('User ID is required', _authexception.AuthExceptionCode.INVALID_INPUT);
        }
        const user = await this.userRepository.findOne({
            where: {
                id: userId
            },
            relations: {
                userWorkspaces: true
            }
        });
        if (!user) {
            throw new _authexception.AuthException('User not found', _authexception.AuthExceptionCode.USER_NOT_FOUND);
        }
        const [firstUserWorkspace] = user.userWorkspaces;
        if (!firstUserWorkspace) {
            throw new _authexception.AuthException('User does not have a workspace', _authexception.AuthExceptionCode.USER_WORKSPACE_NOT_FOUND);
        }
        const isPasswordValid = _authutil.PASSWORD_REGEX.test(newPassword);
        if (!isPasswordValid) {
            throw new _authexception.AuthException('Password is too weak', _authexception.AuthExceptionCode.INVALID_INPUT, {
                userFriendlyMessage: /*i18n*/ {
                    id: "/GJDxy",
                    message: "Password is too weak."
                }
            });
        }
        const newPasswordHash = await (0, _authutil.hashPassword)(newPassword);
        await this.userRepository.update(userId, {
            passwordHash: newPasswordHash
        });
        // Invalidate all existing refresh tokens for this user across all workspaces
        await this.appTokenRepository.update({
            userId,
            type: _apptokenentity.AppTokenType.RefreshToken,
            revokedAt: (0, _typeorm1.IsNull)()
        }, {
            revokedAt: new Date()
        });
        const emailTemplate = (0, _twentyemails.PasswordUpdateNotifyEmail)({
            userName: `${user.firstName} ${user.lastName}`,
            email: user.email,
            link: this.domainServerConfigService.getBaseUrl().toString(),
            locale: firstUserWorkspace.locale
        });
        const html = await (0, _render.render)(emailTemplate, {
            pretty: true
        });
        const text = await (0, _render.render)(emailTemplate, {
            plainText: true
        });
        const passwordChangedMsg = /*i18n*/ {
            id: "bTyBrW",
            message: "Your Password Has Been Successfully Changed"
        };
        const i18n = this.i18nService.getI18nInstance(firstUserWorkspace.locale);
        const subject = i18n._(passwordChangedMsg);
        await this.emailService.send({
            from: `${this.twentyConfigService.get('EMAIL_FROM_NAME')} <${this.twentyConfigService.get('EMAIL_FROM_ADDRESS')}>`,
            to: user.email,
            subject,
            text,
            html
        });
        return {
            success: true
        };
    }
    async findWorkspaceFromInviteHashOrFail(inviteHash) {
        const workspace = await this.workspaceRepository.findOneBy({
            inviteHash
        });
        if (!workspace) {
            throw new _authexception.AuthException('Workspace does not exist', _authexception.AuthExceptionCode.INVALID_INPUT, {
                userFriendlyMessage: /*i18n*/ {
                    id: "qSQPRS",
                    message: "Workspace does not exist."
                }
            });
        }
        return workspace;
    }
    computeRedirectURI({ loginToken, workspace, billingCheckoutSessionState }) {
        const url = this.workspaceDomainsService.buildWorkspaceURL({
            workspace,
            pathname: _types.AppPath.Verify,
            searchParams: {
                loginToken,
                ...billingCheckoutSessionState ? {
                    billingCheckoutSessionState
                } : {}
            }
        });
        return url.toString();
    }
    async findInvitationForSignInUp(params) {
        const qr = this.appTokenRepository.createQueryBuilder('appToken').where('"appToken"."workspaceId" = :workspaceId', {
            workspaceId: params.currentWorkspace.id
        }).andWhere('"appToken".type = :type', {
            type: _apptokenentity.AppTokenType.InvitationToken
        });
        if ('workspacePersonalInviteToken' in params) {
            qr.andWhere('"appToken".value = :personalInviteToken', {
                personalInviteToken: params.workspacePersonalInviteToken
            });
        }
        if ('email' in params) {
            qr.andWhere('"appToken".context->>\'email\' = :email', {
                email: params.email
            });
        }
        return await qr.getOne() ?? undefined;
    }
    async findWorkspaceForSignInUp(params) {
        if (params.workspaceInviteHash) {
            return await this.workspaceRepository.findOne({
                where: {
                    inviteHash: params.workspaceInviteHash
                },
                relations: [
                    'approvedAccessDomains'
                ]
            }) ?? undefined;
        }
        if (params.authProvider !== _workspacetype.AuthProviderEnum.Password) {
            return await this.authSsoService.findWorkspaceFromWorkspaceIdOrAuthProvider({
                email: params.email,
                authProvider: params.authProvider
            }, params.workspaceId) ?? undefined;
        }
        return params.workspaceId ? await this.workspaceRepository.findOne({
            where: {
                id: params.workspaceId
            },
            relations: [
                'approvedAccessDomains'
            ]
        }) : undefined;
    }
    formatUserDataPayload(newUserPayload, existingUser) {
        return {
            userData: existingUser ? {
                type: 'existingUser',
                existingUser
            } : {
                type: 'newUser',
                newUserPayload
            }
        };
    }
    async checkAccessForSignIn({ userData, invitation, workspaceInviteHash, workspace }) {
        const hasPublicInviteLink = !!workspaceInviteHash;
        const hasPersonalInvitation = !!invitation;
        const isInvitedToWorkspace = hasPersonalInvitation || hasPublicInviteLink;
        const isTargetAnExistingWorkspace = !!workspace;
        const isAnExistingUser = userData.type === 'existingUser';
        const email = userData.type === 'newUser' ? userData.newUserPayload.email : userData.existingUser.email;
        if (workspace?.approvedAccessDomains.some((trustDomain)=>trustDomain.isValidated && trustDomain.domain === email.split('@')[1])) {
            return;
        }
        if (hasPublicInviteLink && !hasPersonalInvitation && workspace && !workspace.isPublicInviteLinkEnabled) {
            throw new _authexception.AuthException('Public invite link is disabled for this workspace', _authexception.AuthExceptionCode.FORBIDDEN_EXCEPTION);
        }
        if (!isInvitedToWorkspace && isTargetAnExistingWorkspace && isAnExistingUser) {
            return await this.userService.hasUserAccessToWorkspaceOrThrow(userData.existingUser.id, workspace.id);
        }
        if (!isInvitedToWorkspace && isTargetAnExistingWorkspace && !isAnExistingUser) {
            throw new _authexception.AuthException('User does not have access to this workspace', _authexception.AuthExceptionCode.FORBIDDEN_EXCEPTION, {
                userFriendlyMessage: /*i18n*/ {
                    id: "l9dlVi",
                    message: "User does not have access to this workspace"
                }
            });
        }
    }
    async signInUpWithSocialSSO({ firstName, lastName, email: rawEmail, picture, workspaceInviteHash, workspaceId, billingCheckoutSessionState, action, locale }, authProvider) {
        const email = rawEmail.toLowerCase();
        const availableWorkspacesCount = action === 'list-available-workspaces' ? await this.countAvailableWorkspacesByEmail(email) : 0;
        const existingUser = await this.userService.findUserByEmailWithWorkspaces(email);
        if (!workspaceId && !workspaceInviteHash && action === 'list-available-workspaces' && availableWorkspacesCount > 1) {
            const user = existingUser ?? await this.signInUpService.signUpWithoutWorkspace({
                firstName,
                lastName,
                email,
                picture,
                isEmailAlreadyVerified: true
            }, {
                provider: authProvider
            });
            const url = this.domainServerConfigService.buildBaseUrl({
                pathname: _types.AppPath.SignInUp,
                searchParams: {
                    tokenPair: JSON.stringify({
                        accessOrWorkspaceAgnosticToken: await this.workspaceAgnosticTokenService.generateWorkspaceAgnosticToken({
                            userId: user.id,
                            authProvider
                        }),
                        refreshToken: await this.refreshTokenService.generateRefreshToken({
                            userId: user.id,
                            authProvider,
                            targetedTokenType: _authcontexttype.JwtTokenTypeEnum.WORKSPACE_AGNOSTIC
                        })
                    })
                }
            });
            return url.toString();
        }
        const currentWorkspace = action === 'create-new-workspace' ? undefined : await this.findWorkspaceForSignInUp({
            workspaceId,
            workspaceInviteHash,
            email,
            authProvider
        });
        try {
            const invitation = currentWorkspace && email ? await this.findInvitationForSignInUp({
                currentWorkspace,
                email
            }) : undefined;
            const { userData } = this.formatUserDataPayload({
                firstName,
                lastName,
                email,
                picture,
                locale,
                isEmailAlreadyVerified: true
            }, existingUser);
            await this.checkAccessForSignIn({
                userData,
                invitation,
                workspaceInviteHash,
                workspace: currentWorkspace
            });
            const { user, workspace } = await this.signInUp({
                invitation,
                workspace: currentWorkspace,
                userData,
                authParams: {
                    provider: authProvider
                },
                billingCheckoutSessionState
            });
            await this.createSSOConnectedAccountIfFeatureFlagIsOn({
                workspaceId: workspace.id,
                userId: user.id,
                handle: email,
                authProvider
            });
            const loginToken = await this.loginTokenService.generateLoginToken(user.email, workspace.id, authProvider);
            return this.computeRedirectURI({
                loginToken: loginToken.token,
                workspace,
                billingCheckoutSessionState
            });
        } catch (error) {
            return this.guardRedirectService.getRedirectErrorUrlAndCaptureExceptions({
                error,
                workspace: this.workspaceDomainsService.getSubdomainAndCustomDomainFromWorkspaceFallbackOnDefaultSubdomain(currentWorkspace),
                pathname: _types.AppPath.Verify
            });
        }
    }
    async createSSOConnectedAccountIfFeatureFlagIsOn(input) {
        const provider = input.connectedAccountProvider ?? this.mapAuthProviderToConnectedAccountProvider(input.authProvider);
        const scopes = this.getSSOScopes(provider);
        await this.createSSOConnectedAccountService.createOrUpdateSSOConnectedAccount({
            workspaceId: input.workspaceId,
            userId: input.userId,
            handle: input.handle,
            provider,
            scopes,
            oidcTokenClaims: input.oidcTokenClaims
        });
    }
    mapAuthProviderToConnectedAccountProvider(authProvider) {
        switch(authProvider){
            case _workspacetype.AuthProviderEnum.Google:
                return _types.ConnectedAccountProvider.GOOGLE;
            case _workspacetype.AuthProviderEnum.Microsoft:
                return _types.ConnectedAccountProvider.MICROSOFT;
            case _workspacetype.AuthProviderEnum.SSO:
                return _types.ConnectedAccountProvider.OIDC;
            default:
                throw new Error(`Unsupported auth provider: ${authProvider}`);
        }
    }
    getSSOScopes(provider) {
        switch(provider){
            case _types.ConnectedAccountProvider.GOOGLE:
                return [
                    'email',
                    'profile'
                ];
            case _types.ConnectedAccountProvider.MICROSOFT:
                return [
                    'user.read'
                ];
            case _types.ConnectedAccountProvider.OIDC:
                return [
                    'openid',
                    'email',
                    'profile'
                ];
            case _types.ConnectedAccountProvider.SAML:
                return [];
            case _types.ConnectedAccountProvider.IMAP_SMTP_CALDAV:
                return [];
            case _types.ConnectedAccountProvider.EMAIL_GROUP:
            case _types.ConnectedAccountProvider.APP:
                return [];
            default:
                throw new Error(`Unsupported connected account provider: ${provider}`);
        }
    }
    constructor(accessTokenService, workspaceAgnosticTokenService, workspaceDomainsService, domainServerConfigService, refreshTokenService, loginTokenService, guardRedirectService, userWorkspaceService, workspaceInvitationService, authSsoService, userService, signInUpService, permissionsService, workspaceRepository, userRepository, twentyConfigService, emailService, appTokenRepository, i18nService, auditService, applicationRegistrationService, featureFlagService, createSSOConnectedAccountService){
        this.accessTokenService = accessTokenService;
        this.workspaceAgnosticTokenService = workspaceAgnosticTokenService;
        this.workspaceDomainsService = workspaceDomainsService;
        this.domainServerConfigService = domainServerConfigService;
        this.refreshTokenService = refreshTokenService;
        this.loginTokenService = loginTokenService;
        this.guardRedirectService = guardRedirectService;
        this.userWorkspaceService = userWorkspaceService;
        this.workspaceInvitationService = workspaceInvitationService;
        this.authSsoService = authSsoService;
        this.userService = userService;
        this.signInUpService = signInUpService;
        this.permissionsService = permissionsService;
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.twentyConfigService = twentyConfigService;
        this.emailService = emailService;
        this.appTokenRepository = appTokenRepository;
        this.i18nService = i18nService;
        this.auditService = auditService;
        this.applicationRegistrationService = applicationRegistrationService;
        this.featureFlagService = featureFlagService;
        this.createSSOConnectedAccountService = createSSOConnectedAccountService;
    }
};
AuthService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(13, (0, _typeorm.InjectRepository)(_workspaceentity.WorkspaceEntity)),
    _ts_param(14, (0, _typeorm.InjectRepository)(_userentity.UserEntity)),
    _ts_param(17, (0, _typeorm.InjectRepository)(_apptokenentity.AppTokenEntity)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _accesstokenservice.AccessTokenService === "undefined" ? Object : _accesstokenservice.AccessTokenService,
        typeof _workspaceagnostictokenservice.WorkspaceAgnosticTokenService === "undefined" ? Object : _workspaceagnostictokenservice.WorkspaceAgnosticTokenService,
        typeof _workspacedomainsservice.WorkspaceDomainsService === "undefined" ? Object : _workspacedomainsservice.WorkspaceDomainsService,
        typeof _domainserverconfigservice.DomainServerConfigService === "undefined" ? Object : _domainserverconfigservice.DomainServerConfigService,
        typeof _refreshtokenservice.RefreshTokenService === "undefined" ? Object : _refreshtokenservice.RefreshTokenService,
        typeof _logintokenservice.LoginTokenService === "undefined" ? Object : _logintokenservice.LoginTokenService,
        typeof _guardredirectservice.GuardRedirectService === "undefined" ? Object : _guardredirectservice.GuardRedirectService,
        typeof _userworkspaceservice.UserWorkspaceService === "undefined" ? Object : _userworkspaceservice.UserWorkspaceService,
        typeof _workspaceinvitationservice.WorkspaceInvitationService === "undefined" ? Object : _workspaceinvitationservice.WorkspaceInvitationService,
        typeof _authssoservice.AuthSsoService === "undefined" ? Object : _authssoservice.AuthSsoService,
        typeof _userservice.UserService === "undefined" ? Object : _userservice.UserService,
        typeof _signinupservice.SignInUpService === "undefined" ? Object : _signinupservice.SignInUpService,
        typeof _permissionsservice.PermissionsService === "undefined" ? Object : _permissionsservice.PermissionsService,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _twentyconfigservice.TwentyConfigService === "undefined" ? Object : _twentyconfigservice.TwentyConfigService,
        typeof _emailservice.EmailService === "undefined" ? Object : _emailservice.EmailService,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _i18nservice.I18nService === "undefined" ? Object : _i18nservice.I18nService,
        typeof _auditservice.AuditService === "undefined" ? Object : _auditservice.AuditService,
        typeof _applicationregistrationservice.ApplicationRegistrationService === "undefined" ? Object : _applicationregistrationservice.ApplicationRegistrationService,
        typeof _featureflagservice.FeatureFlagService === "undefined" ? Object : _featureflagservice.FeatureFlagService,
        typeof _createssoconnectedaccountservice.CreateSSOConnectedAccountService === "undefined" ? Object : _createssoconnectedaccountservice.CreateSSOConnectedAccountService
    ])
], AuthService);

//# sourceMappingURL=auth.service.js.map