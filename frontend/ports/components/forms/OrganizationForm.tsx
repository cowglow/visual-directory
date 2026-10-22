import { FormEvent, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "infrastructure/redux/hooks.ts";
import { closeWindow, DialogPayload } from "infrastructure/redux/windows/windows.slice.ts";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import {
  addOrganizationRequested,
  removeOrganizationRequested,
  resetOrganizationMutation,
  updateOrganizationRequested,
} from "infrastructure/redux/organization/organization.slice.ts";
import {
  getOrganizationById,
  getOrganizationMutationError,
  getOrganizationMutationRequestId,
  getOrganizationMutationStatus,
} from "infrastructure/redux/organization/organization.selectors.ts";
import { isLeader } from "infrastructure/redux/auth/auth.selectors.ts";
import { createRequestId } from "infrastructure/redux/request-id.ts";
import { createOrganization } from "domain/organization/organization.factory.ts";
import { getOrganizations } from "infrastructure/redux/organization/organization.selectors.ts";
import type { OrganizationType } from "domain/shared/types.ts";
import Panel from "ports/components/panel/Panel.tsx";
import ConfirmDialog from "ports/components/dialogs/ConfirmDialog.tsx";
import "./forms.css";

const organizationTypes: OrganizationType[] = [
  "Region",
  "Headquarter",
  "Area",
  "District",
  "Group",
];

// Which type a given organization type's parent must be — Region sits at the
// top of the hierarchy and has none. Mirrors docs/INITIAL_ORGANIZATION_MAP.md's
// real-world structure (HS=Headquarter, BR=Area, BZ=District, GR=Group).
const PARENT_TYPE: Partial<Record<OrganizationType, OrganizationType>> = {
  Headquarter: "Region",
  Area: "Headquarter",
  District: "Area",
  Group: "District",
};

interface OrganizationFormProps {
  payload: DialogPayload | null;
  z?: number;
}

export default function OrganizationForm({ payload, z }: OrganizationFormProps) {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const organizations = useSelector(getOrganizations);
  const leader = useSelector(isLeader);
  const existingOrganization = useSelector((state) =>
    payload?.organizationId ? getOrganizationById(state, payload.organizationId) : undefined,
  );
  const isEditMode = Boolean(existingOrganization);

  const [name, setName] = useState(existingOrganization?.name ?? "");
  const [type, setType] = useState<OrganizationType>(existingOrganization?.type ?? "District");
  const [parentId, setParentId] = useState(existingOrganization?.parentId ?? "");
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);

  const pendingRequest = useRef<{ id: string; kind: "save" | "remove" } | null>(null);
  const mutationStatus = useSelector(getOrganizationMutationStatus);
  const mutationRequestId = useSelector(getOrganizationMutationRequestId);
  const mutationError = useSelector(getOrganizationMutationError);

  const requiredParentType = PARENT_TYPE[type];
  const parentOptions = requiredParentType
    ? organizations.filter((organization) => organization.type === requiredParentType)
    : [];

  useEffect(() => {
    if (!parentOptions.some((organization) => organization.id === parentId)) {
      setParentId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  useEffect(() => {
    const pending = pendingRequest.current;
    if (!pending || mutationRequestId !== pending.id) {
      return;
    }
    if (mutationStatus === "succeeded") {
      pendingRequest.current = null;
      dispatch(resetOrganizationMutation());
      if (pending.kind === "save" && !isEditMode && createAnother) {
        // Batch-add: stay open with a blank name instead of closing. Keeps
        // type/parent sticky - adding several orgs at the same level under
        // the same parent in a row is the common case.
        setName("");
      } else {
        dispatch(closeWindow("ORGANIZATION_DIALOG"));
      }
    } else if (mutationStatus === "failed") {
      pendingRequest.current = null;
      alert(
        mutationError ?? (pending.kind === "remove" ? t.organizationForm.removeFailed : t.organizationForm.saveFailed),
      );
      dispatch(resetOrganizationMutation());
    }
  }, [mutationStatus, mutationRequestId, mutationError, isEditMode, createAnother, dispatch, t]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const requestId = createRequestId();
    pendingRequest.current = { id: requestId, kind: "save" };
    if (existingOrganization) {
      dispatch(
        updateOrganizationRequested({
          requestId,
          organization: { ...existingOrganization, name, type, parentId: parentId || undefined },
        }),
      );
    } else {
      dispatch(
        addOrganizationRequested({
          requestId,
          organization: createOrganization(name, type, parentId || undefined),
        }),
      );
    }
  };

  const handleRemove = () => {
    if (!existingOrganization) {
      dispatch(closeWindow("ORGANIZATION_DIALOG"));
      return;
    }
    const requestId = createRequestId();
    pendingRequest.current = { id: requestId, kind: "remove" };
    dispatch(removeOrganizationRequested({ requestId, id: existingOrganization.id }));
  };

  if (confirmingRemove && existingOrganization) {
    return (
      <ConfirmDialog
        title={t.organizationForm.confirmRemoveTitle}
        message={t.organizationForm.confirmRemoveMessage(existingOrganization.name)}
        confirmLabel={t.common.remove}
        onConfirm={handleRemove}
        onCancel={() => setConfirmingRemove(false)}
      />
    );
  }

  return (
    <Panel
      title={isEditMode ? t.organizationForm.editTitle : t.organizationForm.addTitle}
      onClose={() => dispatch(closeWindow("ORGANIZATION_DIALOG"))}
      z={z}
    >
      <form onSubmit={handleSubmit}>
        <div className="field-stack">
          <label htmlFor="org-name">{t.organizationForm.name}</label>
          <input
            id="org-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>

        <div className="field-stack">
          <label htmlFor="org-type">{t.organizationForm.type}</label>
          <select
            id="org-type"
            value={type}
            onChange={(event) =>
              setType(event.target.value as OrganizationType)
            }
          >
            {organizationTypes.map((organizationType) => (
              <option key={organizationType} value={organizationType}>
                {t.organizationTypes[organizationType]}
              </option>
            ))}
          </select>
        </div>

        {requiredParentType && (
          <div className="field-stack">
            <label htmlFor="org-parent">{t.organizationForm.parent}</label>
            <select
              id="org-parent"
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
            >
              <option value="">{t.organizationForm.noParent}</option>
              {parentOptions.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {!isEditMode && (
          <div className="field-row field-stack">
            <input
              id="org-create-another"
              type="checkbox"
              checked={createAnother}
              onChange={(event) => setCreateAnother(event.target.checked)}
            />
            <label htmlFor="org-create-another">{t.organizationForm.createAnother}</label>
          </div>
        )}

        <div
          className="field-row field-stack"
          style={{ justifyContent: "flex-end" }}
        >
          <button
            type="button"
            className="btn"
            onClick={() => dispatch(closeWindow("ORGANIZATION_DIALOG"))}
          >
            {t.common.cancel}
          </button>
          {isEditMode && leader && (
            <button type="button" className="btn" onClick={() => setConfirmingRemove(true)}>
              {t.common.remove}
            </button>
          )}
          <button type="submit" className="btn btn-default">
            {t.common.save}
          </button>
        </div>
      </form>
    </Panel>
  );
}
